import React, { useContext, useState } from 'react';
import { TaskProvider } from '../context/TaskContext';
import { AuthContext } from '../context/AuthContext';
import TaskForm from '../components/tasks/TaskForm';
import TaskFilter from '../components/tasks/TaskFilter';
import Tasks from '../components/tasks/Tasks';

const Dashboard = () => {
  const { user, setupMfa, verifyMfaSetup, loadUser } = useContext(AuthContext);
  const [filter, setFilter] = useState('');
  const [mfaQr, setMfaQr] = useState('');
  const [mfaManualKey, setMfaManualKey] = useState('');
  const [mfaOtp, setMfaOtp] = useState('');
  const [mfaMessage, setMfaMessage] = useState('');

  const onFilterChange = e => {
    setFilter(e.target.value);
  };

  const onSetupMfa = async () => {
    const result = await setupMfa();
    if (!result.success) {
      setMfaMessage(result.error || 'Unable to start MFA setup');
      return;
    }

    setMfaQr(result.data.qrCodeDataUrl);
    setMfaManualKey(result.data.manualKey);
    setMfaMessage('Scan the QR code and enter a code to finish setup');
  };

  const onVerifyMfa = async e => {
    e.preventDefault();
    const result = await verifyMfaSetup(mfaOtp);
    if (!result.success) {
      setMfaMessage(result.error || 'Unable to verify MFA code');
      return;
    }

    setMfaMessage('MFA enabled successfully');
    setMfaQr('');
    setMfaManualKey('');
    setMfaOtp('');
    await loadUser();
  };

  return (
    <TaskProvider>
      <div className="grid-2">
        <div>
          <TaskForm />
        </div>
        <div>
          <h2>Welcome, {user && user.name}</h2>

          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3>Multi-Factor Authentication</h3>
            {user?.mfaEnabled ? (
              <p>MFA is enabled for your account.</p>
            ) : (
              <>
                <button type="button" className="btn btn-primary" onClick={onSetupMfa}>
                  Enable MFA
                </button>
                {mfaQr ? (
                  <form onSubmit={onVerifyMfa} style={{ marginTop: '1rem' }}>
                    <p>Scan this QR code with Google Authenticator, Authy, or 1Password.</p>
                    <img src={mfaQr} alt="MFA QR" style={{ maxWidth: '220px', width: '100%' }} />
                    <p>
                      Manual key: <strong>{mfaManualKey}</strong>
                    </p>
                    <input
                      type="text"
                      value={mfaOtp}
                      onChange={e => setMfaOtp(e.target.value)}
                      maxLength="6"
                      placeholder="Enter 6-digit code"
                      required
                    />
                    <button type="submit" className="btn btn-success" style={{ marginLeft: '0.5rem' }}>
                      Verify
                    </button>
                  </form>
                ) : null}
              </>
            )}
            {mfaMessage ? <p style={{ marginTop: '0.5rem' }}>{mfaMessage}</p> : null}
          </div>

          <TaskFilter filter={filter} onFilterChange={onFilterChange} />
          <Tasks filter={filter} />
        </div>
      </div>
    </TaskProvider>
  );
};

export default Dashboard;