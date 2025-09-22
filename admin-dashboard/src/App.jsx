import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";

// --- START: FIREBASE CONFIGURATION ---
// This robustly checks for credentials from the dev environment, then Netlify, then falls back.
const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : window.firebaseConfig || {
      apiKey: "YOUR_API_KEY", // Fallback for local development
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
    };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
// Reads the App ID from the dev environment, then Netlify, then falls back.
const appId = typeof __app_id !== 'undefined'
  ? __app_id
  : window.appId || 'default-shs-quiz';
// --- END: FIREBASE CONFIGURATION ---

// --- ADMIN CONFIGURATION ---
// IMPORTANT: This password protects your admin dashboard.
const ADMIN_PASSWORD = "123456"; 
// ---

const Spinner = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
);

const AdminLogin = ({ onLogin, error }) => {
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(password);
    };

    return (
        <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-2xl shadow-lg">
            <div className="text-center">
                 <img src="https://www.vhv.rs/dpng/d/427-4271837_indian-oil-logo-png-iocl-transparent-png.png" alt="IOCL Logo" className="h-20 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                <p className="mt-2 text-gray-600">SHS – 2025 Quiz Results</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 mt-1 text-gray-800 bg-gray-100 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {error && <p className="text-sm text-center text-red-500">{error}</p>}
                <button type="submit" className="w-full py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    Login
                </button>
            </form>
        </div>
    );
};

const Dashboard = ({ submissions, onDownloadCSV }) => {
    // Sort submissions by score in descending order
    const sortedSubmissions = useMemo(() => {
        return [...submissions].sort((a, b) => b.score - a.score);
    }, [submissions]);

    return (
        <div className="w-full max-w-4xl p-8 bg-white rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Quiz Submissions ({submissions.length})</h1>
                <button
                    onClick={onDownloadCSV}
                    className="px-4 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                    Download CSV
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted At</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedSubmissions.map((sub, index) => (
                            <tr key={sub.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{sub.employeeId}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{sub.score} / 20</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.submittedAt}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.dob}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authError, setAuthError] = useState('');
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const performSignIn = async () => {
             setLoading(true);
            if (!auth.currentUser) {
                try {
                    const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                    if (token) {
                         await signInWithCustomToken(auth, token);
                    } else {
                         await signInAnonymously(auth);
                    }
                } catch (err) {
                    console.error("Authentication failed:", err);
                    setError("Could not connect to the server.");
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };
        performSignIn();
    }, []);

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const submissionsRef = collection(db, `artifacts/${appId}/public/data/quiz_submissions`);
            const q = query(submissionsRef);
            const querySnapshot = await getDocs(q);
            const subs = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                subs.push({
                    id: doc.id,
                    ...data,
                    submittedAt: data.submittedAt ? data.submittedAt.toDate().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'
                });
            });
            setSubmissions(subs);
        } catch (err) {
            console.error("Error fetching submissions:", err);
            setError("Failed to fetch data. Ensure Firestore is set up correctly.");
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        if(isLoggedIn) {
            fetchSubmissions();
        }
    }, [isLoggedIn]);

    const handleLogin = (password) => {
        if (password === ADMIN_PASSWORD) {
            setIsLoggedIn(true);
            setAuthError('');
        } else {
            setAuthError('Incorrect password.');
        }
    };
    
    const downloadCSV = () => {
        if (submissions.length === 0) return;

        // Create the header row
        const headers = ['Rank', 'Employee ID', 'Score', 'Total Questions', 'Submitted At', 'Date of Birth'];
        
        // Sort submissions by score
        const sorted = [...submissions].sort((a, b) => b.score - a.score);

        // Create the data rows
        const rows = sorted.map((row, index) => [
            index + 1,
            row.employeeId,
            row.score,
            20, // Total questions
            `"${row.submittedAt}"`, // Enclose timestamp in quotes
            row.dob
        ].join(','));

        // Combine headers and rows
        const csvContent = [headers.join(','), ...rows].join('\n');
        
        // Create a Blob and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `quiz_submissions_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };


    const renderContent = () => {
        if (loading && !isLoggedIn) {
             return <div className="flex justify-center items-center"><Spinner /></div>;
        }
        if (!isLoggedIn) {
            return <AdminLogin onLogin={handleLogin} error={authError} />;
        }
        if (loading) {
            return <div className="flex justify-center items-center"><Spinner /></div>;
        }
        if (error) {
            return <p className="text-center text-red-500">{error}</p>;
        }
        return <Dashboard submissions={submissions} onDownloadCSV={downloadCSV} />;
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans flex items-center justify-center p-4">
            {renderContent()}
        </div>
    );
};

export default App;

