'use client';

import { useState } from 'react';

interface MFASetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function MFASetupModal({ isOpen, onClose, onSuccess }: MFASetupModalProps) {
    const [step, setStep] = useState<'setup' | 'verify'>('setup');
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSetup = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/auth/mfa/setup', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();
            if (data.success) {
                setQrCode(data.data.qrCode);
                setSecret(data.data.secret);
                setBackupCodes(data.data.backupCodes);
                setStep('verify');
            }
        } catch (error) {
            alert('Error setting up MFA');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/auth/mfa/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ token: verificationCode }),
            });

            const data = await response.json();
            if (data.success) {
                alert('MFA enabled successfully!');
                onSuccess();
            } else {
                alert('Invalid code. Please try again.');
            }
        } catch (error) {
            alert('Error verifying MFA');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                {step === 'setup' ? (
                    <>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Enable Two-Factor Authentication</h2>
                        <p className="text-gray-600 mb-6">
                            Add an extra layer of security to your account by enabling two-factor authentication (2FA).
                        </p>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <h3 className="font-semibold text-blue-900 mb-2">You'll need:</h3>
                            <ul className="text-sm text-blue-800 space-y-1">
                                <li>• An authenticator app (Google Authenticator, Authy, etc.)</li>
                                <li>• Your smartphone</li>
                                <li>• A few minutes to complete setup</li>
                            </ul>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleSetup}
                                disabled={loading}
                                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? 'Setting up...' : 'Continue'}
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Scan QR Code</h2>
                        <p className="text-gray-600 mb-6">
                            Scan this QR code with your authenticator app, then enter the 6-digit code to verify.
                        </p>

                        {/* QR Code */}
                        <div className="bg-white border-2 border-gray-200 rounded-lg p-4 mb-6">
                            {qrCode ? (
                                <img src={qrCode} alt="MFA QR Code" className="w-full" />
                            ) : (
                                <div className="w-full h-64 bg-gray-100 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                                </div>
                            )}
                        </div>

                        {/* Manual Entry */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <p className="text-xs text-gray-600 mb-2">Can't scan? Enter this code manually:</p>
                            <code className="text-sm font-mono bg-white px-3 py-2 rounded border border-gray-200 block text-center">
                                {secret}
                            </code>
                        </div>

                        {/* Verification Code Input */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Enter 6-digit code</label>
                            <input
                                type="text"
                                maxLength={6}
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center text-2xl font-mono tracking-widest"
                                placeholder="000000"
                            />
                        </div>

                        {/* Backup Codes */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                            <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Save Your Backup Codes</h4>
                            <p className="text-xs text-yellow-800 mb-3">
                                Store these codes in a safe place. You can use them to access your account if you lose your device.
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {backupCodes.map((code, index) => (
                                    <code key={index} className="text-xs font-mono bg-white px-2 py-1 rounded border border-yellow-300">
                                        {code}
                                    </code>
                                ))}
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(backupCodes.join('\n'));
                                    alert('Backup codes copied to clipboard!');
                                }}
                                className="mt-3 text-xs text-yellow-800 hover:text-yellow-900 font-semibold"
                            >
                                📋 Copy All Codes
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleVerify}
                                disabled={loading || verificationCode.length !== 6}
                                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Verifying...' : 'Verify & Enable'}
                            </button>
                            <button
                                onClick={() => setStep('setup')}
                                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                            >
                                Back
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
