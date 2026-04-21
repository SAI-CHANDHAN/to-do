import axios from 'axios';
import { apiUrl } from '../config/api';

const SubscribeButton = () => {
  const handlePayment = async () => {
    try {
      const { data } = await axios.post(apiUrl('/api/payment/create-order'), {});

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY,
        amount: data.amount,
        currency: data.currency,
        order_id: data.id,
        handler: async response => {
          await axios.post(apiUrl('/api/payment/verify'), response);
          alert('Payment successful!');
          window.location.reload();
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      alert('Unable to start payment. Please try again.');
    }
  };

  return <button onClick={handlePayment}>Subscribe</button>;
};

export default SubscribeButton;
