import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LogoutButton from './logout-button';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth-token');

  // Check if user is authenticated
  if (!authToken || authToken.value !== 'authenticated') {
    redirect('/server/login');
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        padding: '40px'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <h1 style={{ 
            margin: 0, 
            color: '#58bfce',
            fontSize: '32px',
            fontWeight: '600'
          }}>
            Dashboard
          </h1>
          <LogoutButton />
        </div>

        <div style={{ 
          padding: '24px',
          background: '#f8f9fa',
          borderRadius: '12px',
          marginBottom: '24px'
        }}>
          <h2 style={{ 
            margin: '0 0 16px 0',
            color: '#333',
            fontSize: '24px'
          }}>
            Welcome, User!
          </h2>
          <p style={{ 
            margin: '0 0 16px 0',
            color: '#666',
            fontSize: '16px'
          }}>
            You have successfully logged in with server-side authentication.
          </p>
          <div style={{ 
            background: '#e8f4fd',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #b3d9ff'
          }}>
            <strong>Login Details:</strong><br />
            Email: vitelis@vitelis.com<br />
            Authentication: Server-side with cookies<br />
            Session: Active
          </div>
        </div>

        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          <div style={{ 
            padding: '24px',
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              🔐
            </div>
            <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>
              Secure Authentication
            </h3>
            <p style={{ margin: 0, color: '#666' }}>
              Server-side validation with HTTP-only cookies
            </p>
          </div>

          <div style={{ 
            padding: '24px',
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              ⚡
            </div>
            <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>
              Fast Performance
            </h3>
            <p style={{ margin: 0, color: '#666' }}>
              Built with Next.js 15 server components
            </p>
          </div>

          <div style={{ 
            padding: '24px',
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              🛡️
            </div>
            <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>
              Protected Route
            </h3>
            <p style={{ margin: 0, color: '#666' }}>
              Automatic redirect for unauthenticated users
            </p>
          </div>
        </div>

        <div style={{ 
          marginTop: '32px',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '12px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>
            How it works:
          </h3>
          <ol style={{ 
            margin: 0,
            paddingLeft: '20px',
            color: '#666',
            lineHeight: '1.6'
          }}>
            <li>User submits login form with credentials</li>
            <li>Server validates against hardcoded credentials</li>
            <li>If valid, server sets HTTP-only cookie</li>
            <li>User is redirected to protected dashboard</li>
            <li>Dashboard checks for valid authentication cookie</li>
            <li>If no valid cookie, user is redirected to login</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
