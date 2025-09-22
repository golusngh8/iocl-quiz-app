import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
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


// --- START: FULL QUESTIONS BANK ---
const quizQuestions = [
    {
        "question": "What is the primary theme of the 'Swachhata Hi Sewa (SHS)' 2025 campaign?",
        "options": ["Garbage Free India", "Clean Water for All", "Digital India", "Green Energy"],
        "answer": 0,
        "topic": "Primary theme of SHS 2025"
    },
    {
        "question": "The Swachh Bharat Mission was launched on the birth anniversary of which Indian leader?",
        "options": ["Sardar Vallabhbhai Patel", "Jawaharlal Nehru", "Mahatma Gandhi", "Subhas Chandra Bose"],
        "answer": 2,
        "topic": "Launch of Swachh Bharat Mission"
    },
    {
        "question": "Which of the following is NOT one of the 3 R's of waste management?",
        "options": ["Reduce", "Reuse", "Recycle", "Recreate"],
        "answer": 3,
        "topic": "The 3 R's of waste management"
    },
    {
        "question": "What does ODF stand for in the context of the Swachh Bharat Mission?",
        "options": ["Open Defecation Free", "Our Duty First", "Open Door Facility", "Official Data Form"],
        "answer": 0,
        "topic": "The meaning of ODF"
    },
    {
        "question": "Which color dustbin is typically designated for dry waste like plastic, paper, and metal?",
        "options": ["Green", "Red", "Yellow", "Blue"],
        "answer": 3,
        "topic": "Color coding of dustbins for dry waste"
    },
    {
        "question": "Composting is a method to process which type of waste?",
        "options": ["E-waste", "Plastic waste", "Wet/Organic waste", "Hazardous waste"],
        "answer": 2,
        "topic": "Composting and organic waste"
    },
    {
        "question": "What is the main goal of the 'Swachh Survekshan'?",
        "options": ["To build toilets in rural areas", "To provide drinking water", "To rank cities on their cleanliness levels", "To fund cleaning equipment"],
        "answer": 2,
        "topic": "The purpose of Swachh Survekshan"
    },
    {
        "question": "Which ministry is the nodal agency for Swachh Bharat Mission (Urban)?",
        "options": ["Ministry of Health and Family Welfare", "Ministry of Housing and Urban Affairs", "Ministry of Rural Development", "Ministry of Environment, Forest and Climate Change"],
        "answer": 1,
        "topic": "Nodal ministry for Swachh Bharat Mission (Urban)"
    },
    {
        "question": "The concept of a 'Circular Economy' is closely related to which Swachhata principle?",
        "options": ["Waste to Wealth", "Daily Sweeping", "Personal Hygiene", "Public Awareness Drives"],
        "answer": 0,
        "topic": "Circular Economy and Waste to Wealth"
    },
    {
        "question": "What is 'plogging', a popular activity promoted under Swachh Bharat?",
        "options": ["Planting trees", "Writing blogs about cleanliness", "Picking up litter while jogging", "Distributing cleaning supplies"],
        "answer": 2,
        "topic": "The activity of 'plogging'"
    },
    {
        "question": "Which of these is considered hazardous domestic waste?",
        "options": ["Vegetable peels", "Expired medicines and batteries", "Newspapers", "Glass bottles"],
        "answer": 1,
        "topic": "Identifying hazardous domestic waste"
    },
    {
        "question": "The second phase of Swachh Bharat Mission (SBM-G) focuses on what key aspect?",
        "options": ["ODF Plus (Solid and Liquid Waste Management)", "Building more toilets", "Cleaning rivers", "Conducting surveys"],
        "answer": 0,
        "topic": "Focus of Swachh Bharat Mission Phase 2"
    },
    {
        "question": "What is the most effective first step towards proper waste management at home?",
        "options": ["Burning the waste", "Throwing everything in one bin", "Segregating waste at source (dry/wet)", "Burying the waste"],
        "answer": 2,
        "topic": "Source segregation of waste"
    },
    {
        "question": "'Shramdaan' is a key activity in the SHS campaign. What does it mean?",
        "options": ["Donating money", "Voluntary contribution of labour for cleanliness", "Attending a workshop", "Taking an online pledge"],
        "answer": 1,
        "topic": "The meaning of 'Shramdaan'"
    },
    {
        "question": "Which of the following is a non-biodegradable item?",
        "options": ["Paper bag", "Cotton cloth", "Plastic bottle", "Fruit peel"],
        "answer": 2,
        "topic": "Identifying non-biodegradable items"
    },
    {
        "question": "The logo of Swachh Bharat Abhiyan features the spectacles of which national icon?",
        "options": ["B. R. Ambedkar", "Mahatma Gandhi", "Sardar Patel", "Jawaharlal Nehru"],
        "answer": 1,
        "topic": "The icon in the Swachh Bharat logo"
    },
    {
        "question": "What is greywater?",
        "options": ["Water from toilets", "Relatively clean waste water from baths, sinks, and washing machines", "Industrial waste water", "Rainwater collected from roofs"],
        "answer": 1,
        "topic": "Definition of greywater"
    },
    {
        "question": "The 'twin-pit toilet' technology is promoted in rural India for what reason?",
        "options": ["It looks modern", "It requires a lot of water", "It is a low-cost and effective method for on-site waste disposal", "It can be moved easily"],
        "answer": 2,
        "topic": "Purpose of twin-pit toilet technology"
    },
    {
        "question": "What does the term 'source segregation' refer to?",
        "options": ["Separating waste at the landfill", "Separating waste into dry and wet categories where it is generated", "Using different trucks for different waste types", "A machine that sorts waste"],
        "answer": 1,
        "topic": "Definition of source segregation"
    },
    {
        "question": "Which color dustbin is typically used for wet waste (biodegradable)?",
        "options": ["Blue", "Green", "Red", "Yellow"],
        "answer": 1,
        "topic": "Color coding of dustbins for wet waste"
    }
];
// --- END: FULL QUESTIONS BANK ---


// --- START: UI COMPONENTS ---

const Spinner = ({size = 'h-8 w-8'}) => (
    <div className={`animate-spin rounded-full ${size} border-b-2 border-white`}></div>
);


const LoginPage = ({ onLogin, loading, error }) => {
    const [employeeId, setEmployeeId] = useState('');
    const [dob, setDob] = useState('');
    const [formError, setFormError] = useState('');

    const validateAndLogin = () => {
        if (!/^\d{8}$/.test(employeeId)) {
            setFormError('Employee ID must be exactly 8 digits.');
            return;
        }
        if (!/^(0[1-9]|[12][0-9]|3[01])(0[1-9]|1[012])(19|20)\d\d$/.test(dob)) {
            setFormError('Date of Birth must be in DDMMYYYY format.');
            return;
        }
        setFormError('');
        onLogin(employeeId, dob);
    };

    return (
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg">
            <div className="text-center">
                <img src="https://www.vhv.rs/dpng/d/427-4271837_indian-oil-logo-png-iocl-transparent-png.png" alt="IOCL Logo" className="h-20 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-gray-800">Swachhata Hi Sewa</h1>
                <p className="mt-2 text-lg text-gray-600">SHS – 2025 Quiz Competition</p>
                <p className="mt-1 text-md font-semibold text-gray-700">ERPL Baitalpur</p>
            </div>
            <div className="space-y-6">
                <div>
                    <label htmlFor="employeeId" className="text-sm font-medium text-gray-700">Employee ID</label>
                    <input id="employeeId" type="text" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="Enter 8-digit ID" maxLength="8" className="w-full px-4 py-3 mt-1 text-gray-800 bg-gray-100 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
                </div>
                <div>
                    <label htmlFor="dob" className="text-sm font-medium text-gray-700">Date of Birth</label>
                    <input id="dob" type="text" value={dob} onChange={(e) => setDob(e.target.value)} placeholder="DDMMYYYY" maxLength="8" className="w-full px-4 py-3 mt-1 text-gray-800 bg-gray-100 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
                </div>
            </div>
            {(formError || error) && <p className="text-sm text-center text-red-500">{formError || error}</p>}
            <button onClick={validateAndLogin} disabled={loading || !employeeId || !dob} className="w-full py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300 ease-in-out">
                {loading ? <Spinner /> : 'Start Quiz'}
            </button>
        </div>
    );
};

const QuizPage = ({ question, onAnswer, questionNumber, totalQuestions, isLastQuestion, onSubmit }) => {
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);

    useEffect(() => {
        setSelectedOption(null);
        setIsAnswered(false);
    }, [question]);

    const handleSelect = (index) => {
        if (isAnswered) return;
        setSelectedOption(index);
        setIsAnswered(true);
        if (!isLastQuestion) {
            setTimeout(() => {
                onAnswer(index);
            }, 500);
        }
    };
    
    const handleSubmitClick = () => {
        if (selectedOption === null) return;
        onSubmit(selectedOption);
    }

    return (
        <div className="w-full max-w-2xl p-8 space-y-6 bg-white rounded-2xl shadow-lg">
            <div className="text-sm text-gray-500">Question {questionNumber} / {totalQuestions}</div>
            <h2 className="text-2xl font-semibold text-gray-800">{question.question}</h2>
            <div className="space-y-4">
                {question.options.map((option, index) => {
                    const isSelected = selectedOption === index;
                    let optionClass = "border-gray-300 hover:bg-gray-100";
                    if (isAnswered && isSelected) {
                        optionClass = "bg-blue-200 border-blue-400 ring-2 ring-blue-300";
                    }
                    return (
                        <div key={index} onClick={() => handleSelect(index)} className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${optionClass}`}>
                            <span className="flex items-center justify-center w-6 h-6 mr-4 text-sm font-bold text-blue-700 bg-blue-100 rounded-full">{String.fromCharCode(65 + index)}</span>
                            <span className="text-lg text-gray-700">{option}</span>
                        </div>
                    );
                })}
            </div>
            {isLastQuestion && isAnswered && (
                 <button onClick={handleSubmitClick} className="w-full mt-6 py-3 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all duration-300 ease-in-out">
                    Submit Quiz
                </button>
            )}
        </div>
    );
};

const ResultPage = ({ user, score, totalQuestions, onGetFeedback, feedback, feedbackLoading, feedbackError, onGeneratePledge, pledge, pledgeLoading, pledgeError }) => {
    const percentage = (score / totalQuestions) * 100;
    let message = '';
    if (percentage >= 90) message = 'Excellent Work!';
    else if (percentage >= 75) message = 'Great Job!';
    else if (percentage >= 50) message = 'Good Effort!';
    else message = 'Keep Learning!';

    return (
        <div className="w-full max-w-md p-8 space-y-6 text-center bg-white rounded-2xl shadow-lg">
            <h1 className="text-3xl font-bold text-gray-800">Quiz Completed!</h1>
            <p className="text-lg text-gray-600">Thank you for your participation.</p>
            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-center text-yellow-500 mb-4">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                   </svg>
                </div>
                 <p className="text-xl font-semibold text-gray-800">{message}</p>
                 <p className="text-md text-gray-600 mt-2">Employee ID: <span className="font-bold">{user.employeeId}</span></p>
                <p className="mt-4 text-5xl font-extrabold text-blue-600">
                    {score}<span className="text-3xl text-gray-500">/{totalQuestions}</span>
                </p>
                <p className="text-lg font-medium text-gray-700">Your Final Score</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {!feedback && (
                    <button onClick={onGetFeedback} disabled={feedbackLoading} className="w-full py-3 font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300 ease-in-out">
                        {feedbackLoading ? <Spinner size="h-6 w-6" /> : "✨ Get Feedback"}
                    </button>
                )}
                 {!pledge && (
                    <button onClick={onGeneratePledge} disabled={pledgeLoading} className="w-full py-3 font-semibold text-white bg-gradient-to-r from-green-500 to-teal-600 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300 ease-in-out">
                        {pledgeLoading ? <Spinner size="h-6 w-6" /> : "✨ Generate Pledge"}
                    </button>
                )}
            </div>

            {feedbackError && <p className="mt-4 text-sm text-red-500">{feedbackError}</p>}
            {pledgeError && <p className="mt-4 text-sm text-red-500">{pledgeError}</p>}
            
            {feedback && (
                <div className="mt-6 p-4 bg-indigo-50 text-left rounded-lg border border-indigo-200">
                    <h3 className="text-lg font-bold text-indigo-800 mb-2">Personalized Learning Plan</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{feedback}</p>
                </div>
            )}
            {pledge && (
                 <div className="mt-6 p-4 bg-green-50 text-left rounded-lg border border-green-200">
                    <h3 className="text-lg font-bold text-green-800 mb-2">My Swachhata Pledge</h3>
                    <p className="text-gray-700 whitespace-pre-wrap font-serif italic">{pledge}</p>
                </div>
            )}
        </div>
    );
};

const App = () => {
    const [page, setPage] = useState('login');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(600);
    
    // State for Gemini API features
    const [feedback, setFeedback] = useState('');
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [feedbackError, setFeedbackError] = useState('');
    const [pledge, setPledge] = useState('');
    const [pledgeLoading, setPledgeLoading] = useState(false);
    const [pledgeError, setPledgeError] = useState('');


    const questions = useMemo(() => quizQuestions.slice(0, 20), []);
    const totalQuestions = questions.length;

    useEffect(() => {
        const performSignIn = async () => {
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
                    setError("Could not connect to the server. Please refresh.");
                    setLoading(false);
                }
            }
        };
        // Delay sign-in slightly to ensure the injected script has run
        setTimeout(performSignIn, 100);
        onAuthStateChanged(auth, (user) => {
            if(user) setLoading(false);
        });
    }, []);

    const submitQuiz = useCallback(async (finalAnswers) => {
        if (!user) return;
        let finalScore = 0;
        finalAnswers.forEach((answer, index) => {
            if (questions[index] && answer === questions[index].answer) {
                finalScore++;
            }
        });
        setScore(finalScore);
        try {
            const submissionRef = doc(db, `artifacts/${appId}/public/data/quiz_submissions`, user.employeeId);
            await setDoc(submissionRef, {
                employeeId: user.employeeId,
                dob: user.dob,
                answers: finalAnswers,
                score: finalScore,
                submittedAt: serverTimestamp()
            });
            setPage('result');
        } catch (err) {
            console.error("Error saving submission:", err);
            setError("Failed to save your results. Please check your connection.");
            setPage('result');
        }
    }, [user, questions, appId]);

    useEffect(() => {
        if (page !== 'quiz') return;
        if (timeLeft <= 0) {
            submitQuiz(answers);
            return;
        }
        const timerId = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1);
        }, 1000);
        return () => clearInterval(timerId);
    }, [page, timeLeft, answers, submitQuiz]);

    const handleLogin = useCallback(async (employeeId, dob) => {
        setLoading(true);
        setError('');
        try {
            const submissionRef = doc(db, `artifacts/${appId}/public/data/quiz_submissions`, employeeId);
            const docSnap = await getDoc(submissionRef);
            if (docSnap.exists()) {
                setError('This Employee ID has already completed the quiz.');
                setLoading(false);
                return;
            }
            setUser({ employeeId, dob });
            setPage('quiz');
        } catch (err) {
            console.error("Error checking user:", err);
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [appId]);

    const handleAnswerSelect = (answerIndex) => {
        const newAnswers = [...answers, answerIndex];
        setAnswers(newAnswers);
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(prevIndex => prevIndex + 1);
        }
    };
    
    const handleQuizSubmit = (lastAnswerIndex) => {
        const finalAnswers = [...answers, lastAnswerIndex];
        setAnswers(finalAnswers);
        submitQuiz(finalAnswers);
    };
    
    // --- START: GEMINI API FEATURE LOGIC ---
    const callGeminiAPI = async (systemPrompt, userQuery) => {
        const apiKey = ""; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
        };
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            return candidate.content.parts[0].text;
        } else {
            throw new Error("Invalid response structure from API.");
        }
    };

    const handleGetFeedback = async () => {
        setFeedbackLoading(true);
        setFeedbackError('');
        try {
            const incorrectQuestions = [];
            answers.forEach((answer, index) => {
                if(questions[index] && answer !== questions[index].answer) {
                    incorrectQuestions.push(questions[index]);
                }
            });

            if (incorrectQuestions.length === 0) {
                setFeedback("Congratulations! You answered all questions correctly. You're a true Swachhata Champion!");
                return;
            }

            const topics = incorrectQuestions.map(q => `- ${q.topic}`).join('\n');
            const systemPrompt = "You are a helpful and encouraging expert on India's Swachh Bharat Mission. Your role is to provide constructive feedback to a quiz participant.";
            const userQuery = `
                Based on the following topics from incorrectly answered quiz questions, please provide a brief, clear, and encouraging explanation for each topic to help me learn. 
                Keep each explanation to 2-3 sentences.
                Finally, conclude with a single, motivational sentence about the importance of individual contribution to a cleaner India.
                
                Incorrect Topics:
                ${topics}
            `;
            const generatedFeedback = await callGeminiAPI(systemPrompt, userQuery);
            setFeedback(generatedFeedback);
        } catch (err) {
            console.error("Gemini API error for feedback:", err);
            setFeedbackError("Sorry, we couldn't generate feedback at this time.");
        } finally {
            setFeedbackLoading(false);
        }
    };
    
    const handleGeneratePledge = async () => {
        setPledgeLoading(true);
        setPledgeError('');
        try {
            const percentage = (score / totalQuestions) * 100;
            const performance_level = percentage >= 75 ? "excellent" : "needs improvement";

            const systemPrompt = "You are a motivational writer for a corporate event. Your task is to generate a short, personal, and inspiring pledge about cleanliness (Swachhata).";
            const userQuery = `
                Generate a 3-4 sentence personal pledge for an employee of Indian Oil Corporation Limited (IOCL) at ERPL Baitalpur.
                The employee's performance in the Swachhata quiz was: ${performance_level}.
                
                If performance was 'excellent', frame it as a "Swachhata Champion's Pledge" to continue leading by example.
                If performance was 'needs improvement', frame it as a "Personal Commitment Pledge" to learn more and make a difference every day.

                The tone should be formal, positive, and empowering. Conclude with a powerful line about building a cleaner nation.
            `;
            const generatedPledge = await callGeminiAPI(systemPrompt, userQuery);
            setPledge(generatedPledge);
        } catch (err) {
            console.error("Gemini API error for pledge:", err);
            setPledgeError("Sorry, we couldn't generate your pledge at this time.");
        } finally {
            setPledgeLoading(false);
        }
    };
    // --- END: GEMINI API FEATURE LOGIC ---


    const renderTimer = () => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        return (
            <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-10">
                <div className="max-w-4xl mx-auto p-2 flex justify-between items-center">
                    <div className="flex items-center">
                        <img src="https://www.vhv.rs/dpng/d/427-4271837_indian-oil-logo-png-iocl-transparent-png.png" alt="IOCL Logo" className="h-12 mr-4" />
                        <div>
                           <div className="text-lg font-bold text-gray-800">SHS Quiz 2025</div>
                           <div className="text-sm text-gray-600">ERPL Baitalpur</div>
                        </div>
                    </div>
                    <div className={`text-xl font-bold px-4 py-1 rounded-lg ${timeLeft < 60 ? 'text-red-600 bg-red-100' : 'text-gray-700 bg-gray-200'}`}>
                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </div>
                </div>
            </div>
        );
    };

    const renderPage = () => {
        switch (page) {
            case 'quiz':
                const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
                return <div className="mt-20"><QuizPage
                    question={questions[currentQuestionIndex]}
                    onAnswer={handleAnswerSelect}
                    questionNumber={currentQuestionIndex + 1}
                    totalQuestions={totalQuestions}
                    isLastQuestion={isLastQuestion}
                    onSubmit={handleQuizSubmit}
                /></div>;
            case 'result':
                return <ResultPage 
                    user={user} 
                    score={score} 
                    totalQuestions={totalQuestions}
                    onGetFeedback={handleGetFeedback}
                    feedback={feedback}
                    feedbackLoading={feedbackLoading}
                    feedbackError={feedbackError}
                    onGeneratePledge={handleGeneratePledge}
                    pledge={pledge}
                    pledgeLoading={pledgeLoading}
                    pledgeError={pledgeError}
                />;
            case 'login':
            default:
                return <LoginPage onLogin={handleLogin} loading={loading} error={error} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans flex items-center justify-center p-4 relative bg-cover bg-center" style={{backgroundImage: "linear-gradient(to right top, #d16ba5, #c777b9, #ba83ca, #aa8fd8, #9a9ae1, #8aa7ec, #79b3f4, #69bff8, #52cffe, #41dfff, #46eefa, #5ffbf1)"}}>
            {page === 'quiz' && renderTimer()}
            <main className={`transition-opacity duration-500 ease-in-out ${loading ? 'opacity-0' : 'opacity-100'}`}>
                {renderPage()}
            </main>
        </div>
    );
};

export default App;

