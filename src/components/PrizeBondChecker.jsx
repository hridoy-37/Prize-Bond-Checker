import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, XCircle, Loader, History, Trash2, FileText, Sparkles } from 'lucide-react';

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
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-slideUp {
    animation: slideUp 0.4s ease-out;
  }
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite linear;
    background: linear-gradient(to right, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
    background-size: 1000px 100%;
  }
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
    }
    50% {
      box-shadow: 0 0 30px rgba(59, 130, 246, 0.8);
    }
  }
  .animate-pulse-glow {
    animation: pulse-glow 2s ease-in-out infinite;
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
            e.target.value = ''; // Reset input
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
            e.target.value = ''; // Reset input for re-upload
            showAlert(`PDF loaded successfully! Found ${pdf.numPages} page(s)`, 'success');
        } catch (error) {
            setLoading(false);
            setPdfFileName('');
            setPdfContent('');
            e.target.value = ''; // Reset input on error
            showAlert('Failed to load PDF file. Please try again with a valid PDF.', 'error');
            console.error('PDF loading error:', error);
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
        <div className={`min-h-screen transition-all duration-500 ${darkMode ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'}`}>
            {alert && (
                <div className="fixed top-24 md:top-28 left-1/2 transform -translate-x-1/2 z-[100] animate-slideDown px-4">
                    <div className={`flex items-center gap-3 px-5 md:px-6 py-3 md:py-4 rounded-2xl shadow-2xl border-2 backdrop-blur-md ${alert.type === 'success'
                            ? darkMode
                                ? 'bg-gradient-to-r from-green-900/95 to-emerald-900/95 border-green-500/50 text-green-100'
                                : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400 text-green-900'
                            : alert.type === 'error'
                                ? darkMode
                                    ? 'bg-gradient-to-r from-red-900/95 to-rose-900/95 border-red-500/50 text-red-100'
                                    : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-400 text-red-900'
                                : darkMode
                                    ? 'bg-gradient-to-r from-blue-900/95 to-indigo-900/95 border-blue-500/50 text-blue-100'
                                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400 text-blue-900'
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
                        <p className="flex-1 font-semibold text-sm md:text-base">{alert.message}</p>
                        <button
                            onClick={() => setAlert(null)}
                            className={`flex-shrink-0 ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'} rounded-full p-1.5 transition-all hover:rotate-90 duration-300`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            <div className={`${darkMode ? 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700' : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600'} text-white py-4 md:py-6 px-4 shadow-2xl sticky top-0 z-50 backdrop-blur-sm`}>
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-center flex-1 min-w-0">
                            <div className="flex items-center justify-center gap-2 md:gap-3 mb-1 md:mb-2">
                                <Sparkles className="w-5 h-5 md:w-8 md:h-8 animate-pulse text-yellow-300 flex-shrink-0" />
                                <h1 className="text-xl md:text-4xl font-black tracking-tight leading-tight">
                                    Prize Bond Checker
                                </h1>
                                <Sparkles className="w-5 h-5 md:w-8 md:h-8 animate-pulse text-yellow-300 flex-shrink-0" />
                            </div>
                            <p className={`text-xs md:text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-blue-100'} px-2`}>
                                ⚡ Instant • 🔒 Private • 📱 Offline
                            </p>
                        </div>
                        <button
                            onClick={toggleDarkMode}
                            className={`ml-2 p-2 md:p-3 rounded-xl ${darkMode ? 'bg-gray-700 hover:bg-gray-600 border border-gray-600' : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'} transition-all duration-300 hover:scale-110 active:scale-95 flex-shrink-0`}
                            aria-label="Toggle dark mode"
                        >
                            {darkMode ? (
                                <svg className="w-5 h-5 md:w-6 md:h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <div className={`${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700/50' : 'bg-white/80 backdrop-blur-sm'} rounded-2xl shadow-xl p-5 md:p-8 mb-5 md:mb-6 transition-all hover:shadow-2xl border-2 ${darkMode ? 'border-gray-700' : 'border-blue-100'} group`}>
                            <div className="flex items-center gap-3 mb-4 md:mb-5">
                                <div className={`p-2 md:p-3 rounded-xl ${darkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                    <FileText className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                                <h2 className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    Upload PDF to Check Bonds
                                </h2>
                            </div>

                            <label className="block w-full">
                                {pdfFileName ? (
                                    <div className={`relative flex items-center justify-between border-2 rounded-2xl p-4 md:p-6 ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-800'} transition-all shadow-md`}>
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <FileText className="w-6 h-6 md:w-8 md:h-8" />
                                            <p className="truncate font-bold text-base md:text-lg">{pdfFileName}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPdfFileName('');
                                                setPdfContent('');
                                                showAlert('PDF removed', 'info');
                                            }}
                                            className={`ml-4 p-2 rounded-xl ${darkMode ? 'bg-red-700 hover:bg-red-600' : 'bg-red-100 hover:bg-red-200'} transition-colors`}
                                            aria-label="Delete uploaded PDF"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        className={`relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all duration-300 hover:scale-[1.02] overflow-hidden ${darkMode ? 'border-gray-600 hover:border-blue-500 bg-gradient-to-br from-gray-700 to-gray-800 text-gray-200' : 'border-gray-300 hover:border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 text-gray-800'}`}
                                        onClick={() => document.getElementById('pdfUploadInput').click()}
                                    >
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity animate-shimmer"></div>
                                        <input
                                            id="pdfUploadInput"
                                            type="file"
                                            accept=".pdf"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            disabled={loading}
                                        />
                                        <Upload className={`mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-blue-400'} animate-float`} size={48} />
                                        <p className="text-base md:text-xl font-bold mb-2">
                                            Drop PDF here or click to browse
                                        </p>
                                        <p className="text-xs md:text-sm">
                                            Official prize bond list • Supports Bengali & English
                                        </p>
                                    </div>
                                )}
                            </label>


                            {pdfFileName && (
                                <div className={`mt-5 p-4 ${darkMode ? 'bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-green-600/50' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'} border-2 rounded-xl flex items-center gap-3 animate-slideDown`}>
                                    <CheckCircle className={`${darkMode ? 'text-green-400' : 'text-green-600'} flex-shrink-0`} size={24} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm md:text-base ${darkMode ? 'text-green-200' : 'text-green-900'} font-bold truncate`}>
                                            {pdfFileName}
                                        </p>
                                        <p className={`text-xs ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                                            Ready to check bonds
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                {pdfContent && (
                    <>
                        <div className={`${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700/50' : 'bg-white/80 backdrop-blur-sm'} rounded-2xl shadow-xl p-5 md:p-8 mb-5 md:mb-6 transition-all hover:shadow-2xl border-2 ${darkMode ? 'border-gray-700' : 'border-purple-100'} animate-slideUp`}>
                            <div className="flex items-center gap-3 mb-4 md:mb-5">
                                <div className={`p-2 md:p-3 rounded-xl ${darkMode ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                </div>
                                <h2 className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    Enter Your Bond Codes
                                </h2>
                            </div>
                            <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4 flex items-center gap-2`}>
                                <span className={`inline-block w-2 h-2 rounded-full ${darkMode ? 'bg-purple-500' : 'bg-purple-600'} animate-pulse`}></span>
                                Comma or new line separated • ১২৩৪৫৬ or 123456
                            </p>

                            <textarea
                                className={`w-full p-4 md:p-5 border-2 ${darkMode ? 'border-gray-600 bg-gray-900/50 text-white placeholder-gray-500 focus:border-purple-500' : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-400'} rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-transparent resize-none text-base md:text-lg font-mono transition-all`}
                                rows="6"
                                placeholder="123456, 234567 or ১২৩৪৫৬, ২৩৪৫৬৭"
                                value={bondCodes}
                                onChange={(e) => setBondCodes(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={checkBonds}
                            disabled={loading || !pdfContent}
                            className={`relative w-full py-4 md:py-5 rounded-2xl font-black text-lg md:text-xl text-white shadow-2xl transition-all mb-5 md:mb-6 flex items-center justify-center gap-3 overflow-hidden group ${loading || !pdfContent
                                    ? `${darkMode ? 'bg-gray-700' : 'bg-gray-400'} cursor-not-allowed`
                                    : `${darkMode ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500' : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700'} hover:shadow-purple-500/50 transform hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-100 animate-pulse-glow`
                                }`}
                        >
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity animate-shimmer"></div>
                            {loading ? (
                                <>
                                    <Loader className="animate-spin" size={28} />
                                    <span className="relative z-10">Analyzing Bonds...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-6 h-6 relative z-10" />
                                    <span className="relative z-10">Check My Bonds</span>
                                    <Sparkles className="w-6 h-6 relative z-10" />
                                </>
                            )}
                        </button>
                    </>
                )}

                {results && (
                    <div
                        className={`transition-all duration-500 ${showResults ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                            }`}
                    >
                        {results.matched.length > 0 ? (
                            <div className={`relative ${darkMode ? 'bg-gradient-to-br from-green-900 via-emerald-900 to-green-900 border-green-500/50' : 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 border-green-400'} border-3 rounded-3xl p-6 md:p-10 mb-5 md:mb-6 shadow-2xl overflow-hidden`}>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-green-400/10 rounded-full blur-3xl"></div>
                                <div className="relative z-10">
                                    <div className="text-center mb-6 md:mb-8">
                                        <div className="text-6xl md:text-7xl mb-5 animate-bounce inline-block">🎉</div>
                                        <h3 className={`text-3xl md:text-4xl font-black ${darkMode ? 'text-green-300' : 'text-green-800'} mb-3`}>
                                            🎊 Congratulations! 🎊
                                        </h3>
                                        <p className={`text-lg md:text-xl font-semibold ${darkMode ? 'text-green-200' : 'text-green-700'}`}>
                                            Your bond number matched!
                                        </p>
                                    </div>

                                    <div className="space-y-3 md:space-y-4">
                                        {results.matched.map((code, index) => (
                                            <div
                                                key={index}
                                                className={`${darkMode ? 'bg-gray-800/80 border-green-600/30' : 'bg-white border-green-300'} p-4 md:p-5 rounded-2xl shadow-lg border-2 flex items-center gap-4 transform transition-all hover:scale-105 hover:shadow-xl`}
                                            >
                                                <div className={`p-3 rounded-xl ${darkMode ? 'bg-green-600/20' : 'bg-green-100'}`}>
                                                    <CheckCircle className={`${darkMode ? 'text-green-400' : 'text-green-600'} flex-shrink-0`} size={28} />
                                                </div>
                                                <span className={`text-xl md:text-2xl font-black ${darkMode ? 'text-green-300' : 'text-green-800'} break-all`}>
                                                    {code}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={`relative ${darkMode ? 'bg-gradient-to-br from-red-900 via-rose-900 to-red-900 border-red-500/50' : 'bg-gradient-to-br from-red-50 via-rose-50 to-red-50 border-red-400'} border-3 rounded-3xl p-6 md:p-10 mb-5 md:mb-6 shadow-2xl overflow-hidden`}>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-red-400/10 rounded-full blur-3xl"></div>
                                <div className="relative z-10 text-center">
                                    <div className="text-6xl md:text-7xl mb-5">😔</div>
                                    <h3 className={`text-3xl md:text-4xl font-black ${darkMode ? 'text-red-300' : 'text-red-800'} mb-3`}>
                                        No Match Found
                                    </h3>
                                    <p className={`text-lg md:text-xl font-semibold ${darkMode ? 'text-red-200' : 'text-red-700'}`}>
                                        Better luck next draw!
                                    </p>
                                </div>
                            </div>
                        )}

                        {results.unmatched.length > 0 && (
                            <div className={`${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/80 border-gray-200'} rounded-2xl p-5 md:p-6 mb-5 md:mb-6 shadow-lg border-2`}>
                                <h4 className={`text-base md:text-lg font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-4 flex items-center gap-2`}>
                                    <XCircle size={20} />
                                    Unmatched Codes
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {results.unmatched.map((code, index) => (
                                        <div
                                            key={index}
                                            className={`${darkMode ? 'bg-gray-700/50 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-700 border-gray-300'} px-3 md:px-4 py-2 md:py-3 rounded-xl text-sm font-mono break-all border`}
                                        >
                                            {code}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={clearResults}
                            className={`w-full py-4 mb-5 ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'} border-2 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl`}
                        >
                            ← Check Again
                        </button>
                    </div>
                )}

                {recentChecks.length > 0 && (
                    <div className={`${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700/50' : 'bg-white/80 backdrop-blur-sm'} rounded-2xl shadow-xl p-5 md:p-6 mb-5 md:mb-6 border-2 ${darkMode ? 'border-gray-700' : 'border-orange-100'}`}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-lg md:text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'} flex items-center gap-2`}>
                                <History size={20} className="md:w-6 md:h-6" />
                                <span className="hidden sm:inline">Recent Checks</span>
                                <span className="sm:hidden">Recent</span>
                            </h2>
                            <button
                                onClick={clearHistory}
                                className={`${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'} flex items-center gap-1 text-sm transition-all hover:scale-110`}
                            >
                                <Trash2 size={16} />
                                <span className="hidden sm:inline">Clear</span>
                            </button>
                        </div>

                        <div className="space-y-3">
                            {recentChecks.slice(0, 5).map((check) => (
                                <div
                                    key={check.id}
                                    onClick={() => loadRecentCheck(check)}
                                    className={`flex items-center justify-between p-3 md:p-4 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'} rounded-xl cursor-pointer transition-all active:scale-95 border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
                                >
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className={`text-xs md:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium`}>
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
                                            <span className={`px-2 md:px-3 py-1 ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'} rounded-full text-xs md:text-sm font-bold flex items-center gap-1`}>
                                                <CheckCircle size={14} />
                                                <span className="hidden sm:inline">{check.matchCount} Match{check.matchCount > 1 ? 'es' : ''}</span>
                                                <span className="sm:hidden">{check.matchCount}</span>
                                            </span>
                                        ) : (
                                            <span className={`px-2 md:px-3 py-1 ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'} rounded-full text-xs md:text-sm font-bold flex items-center gap-1`}>
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

                <div className="text-center py-6 md:py-8">
                    <div className={`inline-flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/80 border-gray-200'} rounded-2xl shadow-lg border-2`}>
                        <span className={`w-3 h-3 ${darkMode ? 'bg-green-400' : 'bg-green-500'} rounded-full animate-pulse`}></span>
                        <p className={`text-xs md:text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            🔒 All checks performed offline • 100% Private
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrizeBondChecker;