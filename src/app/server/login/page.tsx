import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import LoginForm from './login-form';

// Hardcoded credentials
const VALID_CREDENTIALS = {
  email: 'vitelis@vitelis.com',
  password: 'SJHfoo589495164'
};

export default function LoginPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '400px', 
        width: '100%',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        padding: '40px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ 
            marginBottom: '8px', 
            color: '#58bfce',
            fontSize: '28px',
            fontWeight: '600'
          }}>
            Server Login
          </h1>
          <p style={{ color: '#666', margin: 0 }}>
            Sign in with server-side validation
          </p>
        </div>

        <LoginForm validCredentials={VALID_CREDENTIALS} />
        
        <div style={{ 
          marginTop: '24px', 
          padding: '16px', 
          background: '#f5f5f5', 
          borderRadius: '8px',
          fontSize: '14px',
          color: '#666'
        }}>
          <strong>Demo Credentials:</strong><br />
          Email: vitelis@vitelis.com<br />
          Password: SJHfoo589495164
        </div>
      </div>
    </div>
  );
}
