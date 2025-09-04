'use client';

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login({ email, password });
     
      
      if (result.success) {
        console.log('Login successful, redirecting...');
        // Redirect to dashboard or main page after successful login
        router.push('/');
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#141414',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      {/* Logo positioned absolutely */}
      <div style={{
        position: 'absolute',
        top: '40px',
        left: '40px',
        zIndex: 10
      }}>
        {/* <Image
          src="/logo.png"
          alt="Vitelis Logo"
          width={150}
          height={50}
          style={{ objectFit: 'contain' }}
        /> */}
      </div>

      <div style={{
        maxWidth: '400px',
        width: '100%',
        background: '#1f1f1f',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        padding: '40px',
        border: '1px solid #303030'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '600',
            margin: '0 0 8px 0',
            color: '#d9d9d9'
          }}>
            Welcome Back
          </h1>
          <p style={{ color: '#8c8c8c', margin: 0 }}>
            Sign in to your account to continue
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            background: '#2a1f1f',
            border: '1px solid #434343',
            borderRadius: '6px',
            color: '#ff7875',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#d9d9d9'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #434343',
                borderRadius: '6px',
                fontSize: '16px',
                boxSizing: 'border-box',
                background: '#262626',
                color: '#d9d9d9',
                outline: 'none'
              }}
              placeholder="Enter your email"
              onFocus={(e) => {
                e.target.style.borderColor = '#58bfce';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#434343';
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#d9d9d9'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #434343',
                borderRadius: '6px',
                fontSize: '16px',
                boxSizing: 'border-box',
                background: '#262626',
                color: '#d9d9d9',
                outline: 'none'
              }}
              placeholder="Enter your password"
              onFocus={(e) => {
                e.target.style.borderColor = '#58bfce';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#434343';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: loading ? '#434343' : '#58bfce',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#4ac8d7';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#58bfce';
              }
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

    
      </div>
    </div>
  );
}
