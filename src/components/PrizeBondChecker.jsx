import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, XCircle, Loader, History, Trash2 } from 'lucide-react';

const loadPdfJs = () => {
    return new Promise((resolve) => {
        if (window.pdfjsLib) {
            resolve(window.pdfjsLib);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve(window.pdfjsLib);
        };
        document.head.appendChild(script);
    });
};

// Add animation styles
const styles = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translate(-50%, -20px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
  .animate-slideDown {
    animation: slideDown 0.3s ease-out;
  }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

const PrizeBondChecker = () => {
    const [pdfContent, setPdfContent] = useState('');
    const [pdfFileName, setPdfFileName] = useState('');
    const [bondCodes, setBondCodes] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [recentChecks, setRecentChecks] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        loadRecentChecks();
        loadDarkMode();
    }, []);

    const loadDarkMode = () => {
        const saved = localStorage.getItem('darkMode');
        if (saved) {
            setDarkMode(JSON.parse(saved));
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setDarkMode(true);
        }
    };

    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        localStorage.setItem('darkMode', JSON.stringify(newMode));
    };

    const showAlert = (message, type = 'success') => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 4000);
    };

    const loadRecentChecks = () => {
        try {
            const stored = localStorage.getItem('recentChecks');
            if (stored) {
                setRecentChecks(JSON.parse(stored));
            }
        } catch (error) {
            console.log('Error loading recent checks:', error);
        }
    };

    const saveRecentCheck = (codes, matches) => {
        try {
            const newCheck = {
                id: Date.now(),
                codes: codes,
                hasMatch: matches.length > 0,
                matchCount: matches.length,
                date: new Date().toISOString(),
                pdfName: pdfFileName
            };
            const updated = [newCheck, ...recentChecks.slice(0, 9)];
            localStorage.setItem('recentChecks', JSON.stringify(updated));
            setRecentChecks(updated);
        } catch (error) {
            console.log('Error saving check:', error);
        }
    };

    const normalizeBengaliToEnglish = (text) => {
        const bengaliToEnglish = {
            '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
            '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
        };
        return text.replace(/[০-৯]/g, (match) => bengaliToEnglish[match]);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            showAlert('Please upload a PDF file', 'error');
            return;
        }

        // Reset previous data when uploading new PDF
        setBondCodes('');
        setResults(null);
        setShowResults(false);

        setPdfFileName(file.name);
        setLoading(true);

        try {
            const pdfjsLib = await loadPdfJs();
            const arrayBuffer = await file.arrayBuffer();

            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + ' ';
            }

            setPdfContent(fullText);
            setLoading(false);
            showAlert(`PDF loaded successfully! Found ${pdf.numPages} page(s)`, 'success');
        } catch (error) {
            setLoading(false);
            showAlert('Failed to load PDF file. Please make sure it is a valid PDF.', 'error');
            console.error(error);
        }
    };

    const checkBonds = () => {
        if (!pdfContent) {
            showAlert('Please upload a PDF file first', 'error');
            return;
        }

        if (!bondCodes.trim()) {
            showAlert('Please enter bond codes to check', 'error');
            return;
        }

        setLoading(true);
        setShowResults(false);

        setTimeout(() => {
            const normalizedPDF = normalizeBengaliToEnglish(pdfContent);

            const codesArray = bondCodes
                .split(/[,\n\s]+/)
                .map(code => code.trim())
                .filter(code => code.length > 0);

            const matchedCodes = [];
            const unmatchedCodes = [];

            codesArray.forEach(code => {
                const normalizedCode = normalizeBengaliToEnglish(code);
                const cleanCode = normalizedCode.replace(/\D/g, '');

                if (cleanCode.length > 0 && normalizedPDF.includes(cleanCode)) {
                    matchedCodes.push(code);
                } else {
                    unmatchedCodes.push(code);
                }
            });

            const resultData = {
                matched: matchedCodes,
                unmatched: unmatchedCodes,
                total: codesArray.length
            };

            setResults(resultData);
            saveRecentCheck(bondCodes, matchedCodes);
            setLoading(false);
            setShowResults(true);
        }, 800);
    };

    const clearResults = () => {
        setShowResults(false);
        setTimeout(() => setResults(null), 300);
    };

    const loadRecentCheck = (check) => {
        setBondCodes(check.codes);
        showAlert(`Loaded codes from ${new Date(check.date).toLocaleDateString()}`, 'info');
    };

    const clearHistory = () => {
        localStorage.removeItem('recentChecks');
        setRecentChecks([]);
    };

    return (
        <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
            {/* Modern Alert Notification */}
            {alert && (
                <div className="fixed top-24 md:top-28 left-1/2 transform -translate-x-1/2 z-[100] animate-slideDown px-4">
                    <div className={`flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 rounded-lg shadow-2xl border backdrop-blur-sm ${alert.type === 'success'
                            ? darkMode
                                ? 'bg-green-900/95 border-green-600 text-green-100'
                                : 'bg-green-50 border-green-400 text-green-800'
                            : alert.type === 'error'
                                ? darkMode
                                    ? 'bg-red-900/95 border-red-600 text-red-100'
                                    : 'bg-red-50 border-red-400 text-red-800'
                                : darkMode
                                    ? 'bg-blue-900/95 border-blue-600 text-blue-100'
                                    : 'bg-blue-50 border-blue-400 text-blue-800'
                        } min-w-[280px] max-w-md`}>
                        <div className="flex-shrink-0">
                            {alert.type === 'success' ? (
                                <CheckCircle className={darkMode ? 'text-green-400' : 'text-green-600'} size={24} />
                            ) : alert.type === 'error' ? (
                                <XCircle className={darkMode ? 'text-red-400' : 'text-red-600'} size={24} />
                            ) : (
                                <svg className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>
                        <p className="flex-1 font-medium text-sm md:text-base">{alert.message}</p>
                        <button
                            onClick={() => setAlert(null)}
                            className={`flex-shrink-0 ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'} rounded-full p-1 transition-colors`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            <div className={`${darkMode ? 'bg-gradient-to-r from-gray-800 to-gray-900' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} text-white py-6 px-4 shadow-lg sticky top-0 z-50`}>
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                            <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">
                                🎟️ Prize Bond Checker
                            </h1>
                            <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-300' : 'text-blue-100'}`}>
                                Check your bonds instantly, completely offline
                            </p>
                        </div>
                        <button
                            onClick={toggleDarkMode}
                            className={`ml-4 p-2 md:p-3 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-blue-500 hover:bg-blue-400'} transition-colors`}
                            aria-label="Toggle dark mode"
                        >
                            {darkMode ? (
                                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-3 md:p-6 pb-20">
                <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-xl shadow-md p-4 md:p-6 mb-4 md:mb-6 transition-all hover:shadow-lg border ${darkMode ? 'border-gray-700' : ''}`}>
                    <h2 className={`text-lg md:text-xl font-semibold mb-3 md:mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        1. Upload Prize Bond List (PDF)
                    </h2>

                    <label className="block">
                        <div className={`border-2 border-dashed ${darkMode ? 'border-gray-600 hover:border-blue-400 bg-gray-700' : 'border-gray-300 hover:border-blue-500 bg-blue-50'} rounded-lg p-6 md:p-8 text-center cursor-pointer hover:bg-opacity-80 transition-all`}>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={loading}
                            />
                            <Upload className={`mx-auto mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} size={40} />
                            <p className={`text-base md:text-lg font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                {pdfFileName || 'Click to select PDF file'}
                            </p>
                            <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
                                Upload the official prize bond list
                            </p>
                        </div>
                    </label>

                    {pdfFileName && (
                        <div className={`mt-4 p-3 ${darkMode ? 'bg-green-900 border-green-700' : 'bg-green-50 border-green-200'} border rounded-lg flex items-center gap-2`}>
                            <CheckCircle className={`${darkMode ? 'text-green-400' : 'text-green-600'}`} size={20} />
                            <span className={`text-sm md:text-base ${darkMode ? 'text-green-200' : 'text-green-800'} font-medium truncate`}>
                                Loaded: {pdfFileName}
                            </span>
                        </div>
                    )}
                </div>

                <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-xl shadow-md p-4 md:p-6 mb-4 md:mb-6 transition-all hover:shadow-lg border ${darkMode ? 'border-gray-700' : ''}`}>
                    <h2 className={`text-lg md:text-xl font-semibold mb-3 md:mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        2. Enter Your Bond Codes
                    </h2>
                    <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                        Enter codes separated by comma or new line (supports Bengali and English)
                    </p>

                    <textarea
                        className={`w-full p-3 md:p-4 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base`}
                        rows="6"
                        placeholder="e.g., 123456, 234567 or ১২৩৪৫৬, ২৩৪৫৬৭"
                        value={bondCodes}
                        onChange={(e) => setBondCodes(e.target.value)}
                    />
                </div>

                <button
                    onClick={checkBonds}
                    disabled={loading || !pdfContent}
                    className={`w-full py-3 md:py-4 rounded-xl font-bold text-base md:text-lg text-white shadow-lg transition-all mb-4 md:mb-6 flex items-center justify-center gap-2 ${loading || !pdfContent
                            ? `${darkMode ? 'bg-gray-700' : 'bg-gray-400'} cursor-not-allowed`
                            : `${darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'} hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0`
                        }`}
                >
                    {loading ? (
                        <>
                            <Loader className="animate-spin" size={24} />
                            <span className="hidden sm:inline">Processing...</span>
                        </>
                    ) : (
                        <>
                            🔍 Check My Bonds
                        </>
                    )}
                </button>

                {results && (
                    <div
                        className={`transition-all duration-500 ${showResults ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                            }`}
                    >
                        {results.matched.length > 0 ? (
                            <div className={`${darkMode ? 'bg-gradient-to-br from-green-900 to-emerald-900 border-green-600' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-400'} border-2 rounded-xl p-6 md:p-8 mb-4 md:mb-6 shadow-lg`}>
                                <div className="text-center mb-4 md:mb-6">
                                    <div className="text-5xl md:text-6xl mb-4 animate-bounce">🎉</div>
                                    <h3 className={`text-2xl md:text-3xl font-bold ${darkMode ? 'text-green-300' : 'text-green-800'} mb-2`}>
                                        Congratulations!
                                    </h3>
                                    <p className={`text-base md:text-lg ${darkMode ? 'text-green-200' : 'text-green-700'}`}>
                                        Your bond has won!
                                    </p>
                                </div>

                                <div className="space-y-2 md:space-y-3">
                                    {results.matched.map((code, index) => (
                                        <div
                                            key={index}
                                            className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-3 md:p-4 rounded-lg shadow flex items-center gap-3 transform transition-all hover:scale-105`}
                                        >
                                            <CheckCircle className={`${darkMode ? 'text-green-400' : 'text-green-600'} flex-shrink-0`} size={24} />
                                            <span className={`text-lg md:text-xl font-semibold ${darkMode ? 'text-green-300' : 'text-green-800'} break-all`}>
                                                {code}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className={`${darkMode ? 'bg-gradient-to-br from-red-900 to-pink-900 border-red-600' : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-400'} border-2 rounded-xl p-6 md:p-8 mb-4 md:mb-6 shadow-lg`}>
                                <div className="text-center">
                                    <div className="text-5xl md:text-6xl mb-4">❌</div>
                                    <h3 className={`text-2xl md:text-3xl font-bold ${darkMode ? 'text-red-300' : 'text-red-800'} mb-2`}>
                                        No Match Found
                                    </h3>
                                    <p className={`text-base md:text-lg ${darkMode ? 'text-red-200' : 'text-red-700'}`}>
                                        Please wait for the next draw.
                                    </p>
                                </div>
                            </div>
                        )}

                        {results.unmatched.length > 0 && (
                            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-xl p-4 md:p-6 mb-4 md:mb-6 shadow-md border ${darkMode ? 'border-gray-700' : ''}`}>
                                <h4 className={`text-base md:text-lg font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
                                    Unmatched Codes:
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {results.unmatched.map((code, index) => (
                                        <div
                                            key={index}
                                            className={`${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} px-2 md:px-3 py-2 rounded text-sm break-all`}
                                        >
                                            • {code}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={clearResults}
                            className={`w-full py-3 mb-4 ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'} border-2 rounded-lg font-semibold transition-all`}
                        >
                            Check Again
                        </button>
                    </div>
                )}

                {recentChecks.length > 0 && (
                    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-xl shadow-md p-4 md:p-6 mb-4 md:mb-6 border ${darkMode ? 'border-gray-700' : ''}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className={`text-lg md:text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} flex items-center gap-2`}>
                                <History size={20} className="md:w-6 md:h-6" />
                                <span className="hidden sm:inline">Recent Checks</span>
                                <span className="sm:hidden">Recent</span>
                            </h2>
                            <button
                                onClick={clearHistory}
                                className={`${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'} flex items-center gap-1 text-sm`}
                            >
                                <Trash2 size={16} />
                                <span className="hidden sm:inline">Clear</span>
                            </button>
                        </div>

                        <div className="space-y-2 md:space-y-3">
                            {recentChecks.slice(0, 5).map((check) => (
                                <div
                                    key={check.id}
                                    onClick={() => loadRecentCheck(check)}
                                    className={`flex items-center justify-between p-3 md:p-4 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg cursor-pointer transition-all active:scale-95`}
                                >
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                            {new Date(check.date).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1 truncate`}>
                                            {check.pdfName}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {check.hasMatch ? (
                                            <span className={`px-2 md:px-3 py-1 ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'} rounded-full text-xs md:text-sm font-medium flex items-center gap-1`}>
                                                <CheckCircle size={14} />
                                                <span className="hidden sm:inline">{check.matchCount} Match{check.matchCount > 1 ? 'es' : ''}</span>
                                                <span className="sm:hidden">{check.matchCount}</span>
                                            </span>
                                        ) : (
                                            <span className={`px-2 md:px-3 py-1 ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'} rounded-full text-xs md:text-sm font-medium flex items-center gap-1`}>
                                                <XCircle size={14} />
                                                <span className="hidden sm:inline">No match</span>
                                                <span className="sm:hidden">✗</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="text-center py-4 md:py-6">
                    <div className={`inline-flex items-center gap-2 px-3 md:px-4 py-2 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-full shadow-sm`}>
                        <span className={`w-2 h-2 ${darkMode ? 'bg-green-400' : 'bg-green-500'} rounded-full animate-pulse`}></span>
                        <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            All checks are performed offline on your device
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrizeBondChecker;