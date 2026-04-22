import React, { useState } from 'react';
import axios from 'axios';

const RescheduleModal = ({ isOpen, onClose, sessionId, sessionType, initiatedBy, token, onSuccess }) => {
    const [requestedDate, setRequestedDate] = useState('');
    const [requestedTime, setRequestedTime] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const endpoint = initiatedBy === 'STUDENT'
            ? `${import.meta.env.VITE_API_BASE_URL}/api/classes/student/reschedule/`
            : `${import.meta.env.VITE_API_BASE_URL}/api/classes/tutor/reschedule/`;

        try {
            await axios.post(
                endpoint,
                {
                    session_id: sessionId,
                    session_type: sessionType,
                    requested_date: requestedDate,
                    requested_time: requestedTime,
                    reason
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert('Reschedule request submitted successfully');
            setRequestedDate('');
            setRequestedTime('');
            setReason('');
            onClose();
            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit reschedule request');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Request Reschedule</h2>
                {initiatedBy === 'TUTOR' && (
                    <p className="text-sm text-yellow-600 mb-4">
                        ⚠️ Note: Requests must be made at least 1 hour before the class
                    </p>
                )}

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2">New Date</label>
                        <input
                            type="date"
                            value={requestedDate}
                            onChange={(e) => setRequestedDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2">New Time</label>
                        <input
                            type="time"
                            value={requestedTime}
                            onChange={(e) => setRequestedTime(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2">Reason</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary h-24"
                            required
                            placeholder="Please explain why you need to reschedule"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark disabled:opacity-50"
                        >
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RescheduleModal;
