import pymongo
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import sys

# Hardcoded from .env
MONGO_URI = "mongodb+srv://cggkcj:R186UMnxRDQZAdQC@real-estate.bnbjv.mongodb.net/real-estate?retryWrites=true&w=majority&appName=real-est"
DB_NAME = "real-estate"
COLLECTION_NAME = "listings"

def encode_category(val):
    if not val: return 0.5
    val = str(val)
    s = sum(ord(c) for c in val)
    return (s % 100) / 100.0

def get_data():
    client = pymongo.MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    
    properties = list(collection.find())
    print(f"Fetched {len(properties)} properties from MongoDB.")
    
    data = []
    for p in properties:
        # Price Logic
        price = p.get('regularPrice', 0)
        if p.get('offer') and p.get('discountPrice'):
            price = p.get('discountPrice')
            
        # Skip invalid prices
        if not price or price <= 0:
            continue
            
        data.append({
            "area_sqft": float(p.get("areaSqFt", 1000) or 1000),
            "bedrooms": int(p.get("bedrooms", 1) or 1),
            "bathrooms": int(p.get("bathrooms", 1) or 1),
            "city": p.get("city", "unknown"),
            "type": p.get("type", "unknown"),
            "age_years": int(p.get("age", 5) or 5),
            "price": float(price),
            "id": str(p.get("_id"))
        })
    return data

def train_and_test():
    properties = get_data()
    if len(properties) < 5:
        print("Not enough data to train/test.")
        return

    # Preprocessing
    areas = np.array([p["area_sqft"] for p in properties], dtype=float)
    area_min, area_max = areas.min(), areas.max()
    normalized_areas = (areas - area_min) / (area_max - area_min + 1e-8)
    
    bedrooms = np.array([p["bedrooms"] for p in properties], dtype=int)
    bathrooms = np.array([p["bathrooms"] for p in properties], dtype=int)
    age_years = np.array([p["age_years"] for p in properties], dtype=int)
    city_code = np.array([encode_category(p["city"]) for p in properties], dtype=float)
    
    # Strict Type Encoding
    type_code = []
    for p in properties:
        t = str(p["type"]).lower()
        if t == "rent":
            type_code.append(0.0)
        elif t == "sale":
            type_code.append(1.0)
        else:
            type_code.append(0.5)
    type_code = np.array(type_code, dtype=float)
    
    # Target
    y = np.array([p["price"] for p in properties], dtype=float)
    y_log = np.log1p(y) # Log transform
    
    X = np.column_stack([
        normalized_areas,
        bedrooms,
        bathrooms,
        city_code,
        type_code,
        age_years
    ])
    
    # Split
    X_train, X_test, y_log_train, y_log_test, idx_train, idx_test = train_test_split(
        X, y_log, np.arange(len(properties)), test_size=0.2, random_state=42
    )
    
    # Scales
    scaler_X = StandardScaler()
    scaler_y = StandardScaler() # Optional for target, but we'll use it to match main.py logic if used there
    # actually main.py uses scaler_y on y_log.
    
    X_train_scaled = scaler_X.fit_transform(X_train)
    X_test_scaled = scaler_X.transform(X_test)
    
    y_log_train_reshaped = y_log_train.reshape(-1, 1)
    y_log_train_scaled = scaler_y.fit_transform(y_log_train_reshaped).ravel()
    
    # Train
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train_scaled, y_log_train_scaled)
    
    # Predict
    y_pred_log_scaled = model.predict(X_test_scaled)
    y_pred_log = scaler_y.inverse_transform(y_pred_log_scaled.reshape(-1, 1)).ravel()
    y_pred = np.expm1(y_pred_log) # Inverse Log
    
    y_test_actual = np.expm1(y_log_test)
    
    # Results
    print("\n" + "="*80)
    print(f"{'ID':<25} | {'Type':<6} | {'Actual Price':<15} | {'Predicted':<15} | {'Diff %':<10}")
    print("="*80)
    
    rent_errors = []
    sale_errors = []
    
    for i in range(len(y_test_actual)):
        idx = idx_test[i]
        prop = properties[idx]
        actual = y_test_actual[i]
        predicted = y_pred[i]
        
        diff_pct = ((predicted - actual) / actual) * 100
        
        # Categorize error
        if prop["type"].lower() == 'rent':
            rent_errors.append(abs(diff_pct))
        else:
            sale_errors.append(abs(diff_pct))
            
        print(f"{prop['id']:<25} | {prop['type']:<6} | {actual:,.0f}{' ':<8} | {predicted:,.0f}{' ':<8} | {diff_pct:+.2f}%")

    print("="*80)
    print(f"Average Rent Error: {np.mean(rent_errors) if rent_errors else 0:.2f}%")
    print(f"Average Sale Error: {np.mean(sale_errors) if sale_errors else 0:.2f}%")
    print(f"Overall MAE %: {np.mean(rent_errors + sale_errors):.2f}%")
    
if __name__ == "__main__":
    train_and_test()
