import { useEffect, useState } from 'react';

export default function Contact({ listing }) {
  const [landlord, setLandlord] = useState(null);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(null);
  const onChange = (e) => setMessage(e.target.value);

  useEffect(() => {
    const fetchLandlord = async () => {
      try {
        const res = await fetch(`/api/user/${listing.userRef}`);
        const data = await res.json();
        setLandlord(data);
      } catch (error) {
        console.log(error);
      }
    };
    fetchLandlord();
  }, [listing.userRef]);

  const handleSend = async () => {
    if (!message || message.trim().length < 3) {
      setStatus({ type: 'error', text: 'Please enter a message (3+ characters).' });
      return;
    }
    try {
      setStatus({ type: 'pending', text: 'Sending...' });
      const res = await fetch('/api/contact/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: landlord.email,
          subject: `Inquiry about ${listing.name}`,
          text: message,
          fromName: 'Website User',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', text: 'Message sent to landlord.' });
        setMessage('');
      } else {
        setStatus({ type: 'error', text: data.message || 'Failed to send message.' });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: 'Network error while sending message.' });
    }
  };

  return (
    <>
      {landlord && (
        <div className='flex flex-col gap-2'>
          <p>
            Contact <span className='font-semibold'>{landlord.username}</span>{' '}
            for{' '}
            <span className='font-semibold'>{listing.name.toLowerCase()}</span>
          </p>
          <textarea
            name='message'
            id='message'
            rows='2'
            value={message}
            onChange={onChange}
            placeholder='Enter your message here...'
            className='w-full border text-black p-3 rounded-lg'
          ></textarea>

          <button
            onClick={handleSend}
            className='bg-yellow-400 font-bold text-black text-center p-3 uppercase rounded-lg hover:opacity-95'
          >
            Send Message
          </button>

          {status && (
            <p className={`text-sm ${status.type === 'error' ? 'text-red-500' : status.type === 'success' ? 'text-green-600' : 'text-gray-600'}`}>{status.text}</p>
          )}
        </div>
      )}
    </>
  );
}
