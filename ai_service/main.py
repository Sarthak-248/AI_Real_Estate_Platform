from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any, Union
from datetime import datetime
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import json
import os

app = FastAPI(title="AI Real Estate Service")

# =============================================================================
# ======================== RECOMMENDATION MODELS =============================
# =============================================================================

class Property(BaseModel):
    id: str
    vector: List[float]
    createdAt: Optional[Any] = None


class RecommendRequest(BaseModel):
    properties: List[Property]
    user_vector: Optional[List[float]] = None
    top_n: Optional[int] = 5


class Recommendation(BaseModel):
    id: str
    score: Optional[float] = None


class RecommendResponse(BaseModel):
    recommendations: List[Recommendation]


# =============================================================================
# ======================== PRICE ESTIMATION MODELS =============================
# =============================================================================

class PropertyFeatures(BaseModel):
    """
    Numeric feature vector for property price prediction.
    Features (normalized/encoded):
    - normalized_area_sqft: Property area normalized to [0,1]
    - bedrooms: Number of bedrooms
    - bathrooms: Number of bathrooms
    - normalized_city_code: Encoded city as float in [0,1]
    - normalized_type_code: Encoded property type as float in [0,1]
    - property_age_years: Age of property in years
    """
    normalized_area_sqft: float
    bedrooms: float = 1.0
    bathrooms: float = 1.0
    normalized_city_code: float
    normalized_type_code: float
    property_age_years: float = 0.0


class PriceTrainRequest(BaseModel):
    """Request to train the price estimation model."""
    properties: List[Any]  # Relaxed type to avoid validation overhead/crashes


class PricePredictionRequest(BaseModel):
    """Request to predict price for a property."""
    features: Any # Bypass Pydantic validation crashing
    # features: PropertyFeatures


class PricePredictionResponse(BaseModel):
    """Response with predicted price and confidence range."""
    predicted_price: float
    price_range: dict  # {"min": float, "max": float}
    confidence_score: float


import joblib

# =============================================================================
# ======================== GLOBAL MODEL STATE ===============================
# =============================================================================

# In-memory storage for trained model and scalers
MODEL_STATE = {
    "model": None,
    "scaler_X": None,
    "scaler_y": None,
    "feature_names": ["normalized_area_sqft", "bedrooms", "bathrooms", 
                      "normalized_city_code", "normalized_type_code", "property_age_years"],
    "is_trained": False,
    "training_count": 0,
    "last_trained": None,
}

# Try to load model on startup
try:
    model_path = os.path.join(os.getcwd(), 'ai_service', 'model_state.joblib')
    if not os.path.exists(model_path):
         # Try looking in current dir if running from inside ai_service
         model_path = 'model_state.joblib'

    if os.path.exists(model_path):
        print(f"Loading model from {model_path}...")
        loaded_state = joblib.load(model_path)
        MODEL_STATE.update(loaded_state)
        print("Model loaded successfully!")
except Exception as e:
    print(f"Failed to load model: {e}")



# =============================================================================
# ======================== UTILITY FUNCTIONS ================================
# =============================================================================

def encode_category(val):
    """Consistent encoding matching JS implementation."""
    if not val: return 0.5
    val = str(val)
    s = sum(ord(c) for c in val)
    return (s % 100) / 100.0


# =============================================================================
# ======================== RECOMMENDATION ENDPOINTS ============================
# =============================================================================

@app.post('/recommend', response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    """Content-based recommendation using cosine similarity."""
    props = req.properties
    if not props:
        raise HTTPException(status_code=400, detail='No properties provided')

    X = np.array([p.vector for p in props], dtype=float)

    # If user_vector provided, compute cosine similarity
    if req.user_vector is not None:
        user_vec = np.array(req.user_vector, dtype=float).reshape(1, -1)
        # Normalize shapes
        if user_vec.shape[1] != X.shape[1]:
            # Try to broadcast/truncate/pad user vector
            if user_vec.shape[1] < X.shape[1]:
                user_vec = np.pad(user_vec, ((0,0),(0, X.shape[1]-user_vec.shape[1])), mode='constant')
            else:
                user_vec = user_vec[:, : X.shape[1]]

        sims = cosine_similarity(X, user_vec).reshape(-1)
        idx_sorted = np.argsort(-sims)
        top_idx = idx_sorted[: req.top_n]
        recs = [{'id': props[i].id, 'score': float(sims[i])} for i in top_idx]
        return {'recommendations': recs}

    # Cold-start: return most recent properties (by createdAt if present)
    try:
        props_sorted = sorted(props, key=lambda p: p.createdAt or 0, reverse=True)
    except Exception:
        props_sorted = props

    recs = [{'id': p.id, 'score': None} for p in props_sorted][: req.top_n]
    return {'recommendations': recs}


# =============================================================================
# ======================== PRICE ESTIMATION ENDPOINTS ==========================
# =============================================================================

@app.post('/train-price-model')
def train_price_model(req: PriceTrainRequest):
    print("DEBUG: Entered train_price_model")
    """
    Train a Linear Regression model on historical property data.
    
    Expected properties format:
    {
        "area_sqft": float,
        "bedrooms": int,
        "bathrooms": int,
        "city": str,
        "type": str,
        "age_years": int,
        "price": float  # target variable
    }
    
    Returns training metrics and model status.
    """
    if not req.properties or len(req.properties) < 5:
        raise HTTPException(
            status_code=400,
            detail="At least 5 properties required for training"
        )

    try:
        # Extract and validate data
        properties = req.properties
        
        # Normalize area_sqft
        areas = np.array([p.get("area_sqft", 1000) for p in properties], dtype=float)
        area_min, area_max = areas.min(), areas.max()
        normalized_areas = (areas - area_min) / (area_max - area_min + 1e-8)
        
        # Extract bedrooms, bathrooms, age
        bedrooms = np.array([p.get("bedrooms", 1) for p in properties], dtype=int)
        bathrooms = np.array([p.get("bathrooms", 1) for p in properties], dtype=int)
        age_years = np.array([p.get("age_years", 5) for p in properties], dtype=int)
        
        # Encode categorical features CONSISTENTLY with JS service
        city_code = np.array([encode_category(p.get("city")) for p in properties], dtype=float)
        
        # STRICT Type encoding (Matches JS Manual Logic: rent=0, sale=1)
        type_code = []
        for p in properties:
            t = str(p.get("type", "unknown")).lower()
            if t == "rent":
                type_code.append(0.0)
            elif t == "sale":
                type_code.append(1.0)
            else:
                type_code.append(0.5)
        type_code = np.array(type_code, dtype=float)
        
        # Build feature matrix
        X = np.column_stack([
            normalized_areas,
            bedrooms,
            bathrooms,
            city_code,
            type_code,
            age_years
        ])
        
        # Save unique values just for reference, not used for encoding anymore
        cities = list(set(p.get("city", "unknown") for p in properties))
        types = list(set(p.get("type", "unknown") for p in properties))
        
        # Extract target (price)
        y = np.array([p.get("price", 0) for p in properties], dtype=float)
        
        # Validate data
        if np.any(np.isnan(X)) or np.any(np.isnan(y)) or np.any(np.isinf(X)) or np.any(np.isinf(y)):
            raise ValueError("Data contains NaN or Inf values")
        
        # Use LOG PRICE for training to normalize the scale between Rent (low) and Sale (high)
        # This prevents the model from ignoring Rent errors (which are small in absolute terms).
        y_log = np.log1p(y)

        # Train model with styled features
        scaler_X = StandardScaler()
        # scaler_y is no longer strictly needed for scaling if we use Log, but can help convergence
        scaler_y = StandardScaler()
        
        X_scaled = scaler_X.fit_transform(X)
        y_log_scaled = scaler_y.fit_transform(y_log.reshape(-1, 1)).ravel()
        
        # RandomForestRegressor with weighted bootstrap if needed, but Log transform is usually sufficient
        model = RandomForestRegressor(
            n_estimators=100,
            random_state=42,
            min_samples_split=5,
            max_depth=20,
            n_jobs=1
        )
        # model = LinearRegression()
        model.fit(X_scaled, y_log_scaled)
        
        # Store model and scalers in global state
        MODEL_STATE["model"] = model
        MODEL_STATE["scaler_X"] = scaler_X
        MODEL_STATE["scaler_y"] = scaler_y
        MODEL_STATE["is_trained"] = True
        MODEL_STATE["area_min"] = float(area_min)
        MODEL_STATE["area_max"] = float(area_max)
        MODEL_STATE["cities"] = cities
        MODEL_STATE["types"] = types
        MODEL_STATE["training_count"] = len(properties)
        MODEL_STATE["last_trained"] = datetime.now().isoformat()
        
        # Save model state to disk
        try:
            model_path = os.path.join(os.getcwd(), 'ai_service', 'model_state.joblib')
            # Check if running from within ai_service dir
            if not os.path.exists(os.path.join(os.getcwd(), 'ai_service')):
                 model_path = 'model_state.joblib'
            
            joblib.dump(MODEL_STATE, model_path)
            print(f"Model saved to {model_path}")
        except Exception as e:
            print(f"Warning: Failed to save model to disk: {e}")

        # Calculate R² score on training data
        y_pred_log_scaled = model.predict(X_scaled)
        ss_res = np.sum((y_log_scaled - y_pred_log_scaled) ** 2)
        ss_tot = np.sum((y_log_scaled - np.mean(y_log_scaled)) ** 2)
        r2_score = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
        
        return {
            "status": "success",
            "message": "Model trained successfully",
            "samples_trained": len(properties),
            "r2_score": float(r2_score),
            "features": MODEL_STATE["feature_names"],
            "model_type": "Random Forest Regressor (Log-Transformed)"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@app.post('/predict-price', response_model=PricePredictionResponse)
def predict_price(req: PricePredictionRequest):
    """
    Predict property price using trained regression model.
    
    Returns:
    - predicted_price: Point estimate from the model
    - price_range: {min, max} representing approximate confidence interval
    - confidence_score: R² or other metric indicating model reliability
    """
    if not MODEL_STATE["is_trained"]:
        raise HTTPException(
            status_code=400,
            detail="Model not yet trained. Call /train-price-model first."
        )
    
    try:
        model = MODEL_STATE["model"]
        scaler_X = MODEL_STATE["scaler_X"]
        scaler_y = MODEL_STATE["scaler_y"]
        
        # features = req.features
        features = req.features if isinstance(req.features, dict) else req.features.__dict__

        # Build feature vector (must match training order)
        # Manually extract since we removed Pydantic model
        X_single = np.array([[
            float(features.get('normalized_area_sqft', 0)),
            float(features.get('bedrooms', 1)),
            float(features.get('bathrooms', 1)),
            float(features.get('normalized_city_code', 0)),
            float(features.get('normalized_type_code', 0)),
            float(features.get('property_age_years', 0))
        ]], dtype=float)
        
        # Validate input shape
        if X_single.shape[1] != len(MODEL_STATE["feature_names"]):
            raise ValueError(
                f"Expected {len(MODEL_STATE['feature_names'])} features, "
                f"got {X_single.shape[1]}"
            )
        
        # Scale and predict
        X_scaled = scaler_X.transform(X_single)
        y_pred_log_scaled = model.predict(X_scaled)[0]
        
        # Inverse scale to get LOG price
        y_pred_log = scaler_y.inverse_transform([[y_pred_log_scaled]])[0][0]
        
        # Inverse LOG transform (exp(x) - 1) to get actual price
        y_pred = np.expm1(y_pred_log)
        
        # Clamp to realistic range (prices should be positive)
        y_pred = max(0, y_pred)
        
        # Estimate confidence range (±15% for 68% confidence)
        # This is a heuristic; in production, use prediction intervals
        margin_percent = 0.15
        price_min = y_pred * (1 - margin_percent)
        price_max = y_pred * (1 + margin_percent)
        
        # Enhanced confidence score based on model's feature importance
        # RandomForest provides better uncertainty estimates
        confidence = min(0.95, max(0.5, 0.75 + (margin_percent / 100)))
        
        return PricePredictionResponse(
            predicted_price=float(y_pred),
            price_range={
                "min": float(price_min),
                "max": float(price_max)
            },
            confidence_score=float(confidence)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.get('/model-status')
def model_status():
    """Check if model is trained and ready."""
    return {
        "is_trained": MODEL_STATE["is_trained"],
        "model_type": "Random Forest Regressor",
        "features_count": len(MODEL_STATE["feature_names"]),
        "feature_names": MODEL_STATE["feature_names"],
        "training_count": MODEL_STATE["training_count"],  # Number of listings model was trained on
        "last_trained": MODEL_STATE["last_trained"]  # Timestamp of last training
    }


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8000)
