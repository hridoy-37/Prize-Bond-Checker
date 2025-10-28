import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Upload, CheckCircle, XCircle, Loader, History, Trash2 } from 'lucide-react';

// ✅ Lazy load pdf.js once
const loadPdfJs = () =>
    new Promise((resolve) => {
        if (window.pdfjsLib) return resolve(window.pdfjsLib);
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve(window.pdfjsLib);
        };
        document.head.appendChild(script);
    });

// ✅ Bengali to English number converter (memoized)
const normalizeBengaliToEnglish = (text) =>
    text.replace(/[০-৯]/g, (match) =>
        ({ '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' }[match])
    );

const PrizeBondChecker = () => {
    const [pdfContent, setPdfContent] = useState('');
    const [pdfFileName, setPdfFileName] = useState('');
    const [bondCodes, setBondCodes] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [recentChecks, setRecentChecks] = useState([]);
    const [darkMode, setDarkMode] = useState(false);
    const [alert, setAlert] = useState(null);

    // === INITIAL LOAD ===
    useEffect(() => {
        const savedDark = localStorage.getItem('darkMode');
        if (savedDark) setDarkMode(JSON.parse(savedDark));
        else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setDarkMode(true);

        const stored = localStorage.getItem('recentChecks');
        if (stored) setRecentChecks(JSON.parse(stored));
    }, []);

    // === ALERT ===
    const showAlert = useCallback((message, type = 'success') => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 4000);
    }, []);

    // === TOGGLE THEME ===
    const toggleDarkMode = useCallback(() => {
        setDarkMode((prev) => {
            localStorage.setItem('darkMode', JSON.stringify(!prev));
            return !prev;
        });
    }, []);

    // === SAVE CHECK HISTORY ===
    const saveRecentCheck = useCallback((codes, matches, pdfName) => {
        const newCheck = {
            id: Date.now(),
            codes,
            hasMatch: matches.length > 0,
            matchCount: matches.length,
            date: new Date().toISOString(),
            pdfName,
        };
        const updated = [newCheck, ...recentChecks.slice(0, 9)];
        localStorage.setItem('recentChecks', JSON.stringify(updated));
        setRecentChecks(updated);
    }, [recentChecks]);

    // === LOAD RECENT CHECK ===
    const loadRecentCheck = useCallback((check) => {
        setBondCodes(check.codes);
        showAlert(`Loaded codes from ${new Date(check.date).toLocaleDateString()}`, 'info');
    }, [showAlert]);

    // === CLEAR HISTORY ===
    const clearHistory = useCallback(() => {
        localStorage.removeItem('recentChecks');
        setRecentChecks([]);
    }, []);

    // === FILE UPLOAD HANDLER ===
    const handleFileUpload = useCallback(async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.type !== 'application/pdf') return showAlert('Please upload a valid PDF', 'error');

        setBondCodes('');
        setResults(null);
        setPdfFileName(file.name);
        setLoading(true);

        try {
            const pdfjsLib = await loadPdfJs();
            const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
            const textPromises = Array.from({ length: pdf.numPages }, async (_, i) => {
                const page = await pdf.getPage(i + 1);
                const content = await page.getTextContent();
                return content.items.map((it) => it.str).join(' ');
            });

            const textContent = (await Promise.all(textPromises)).join(' ');
            setPdfContent(textContent);
            showAlert(`Loaded ${pdf.numPages} page(s) successfully`);
        } catch (err) {
            showAlert('Failed to parse PDF', 'error');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [showAlert]);

    // === BOND CHECKER ===
    const checkBonds = useCallback(() => {
        if (!pdfContent) return showAlert('Please upload a PDF first', 'error');
        if (!bondCodes.trim()) return showAlert('Enter bond codes first', 'error');

        setLoading(true);
        setTimeout(() => {
            const normalizedPDF = normalizeBengaliToEnglish(pdfContent);
            const codesArray = bondCodes
                .split(/[,\n\s]+/)
                .map((c) => c.trim())
                .filter(Boolean);

            const matched = [];
            const unmatched = [];

            for (const code of codesArray) {
                const clean = normalizeBengaliToEnglish(code).replace(/\D/g, '');
                (normalizedPDF.includes(clean) ? matched : unmatched).push(code);
            }

            const data = { matched, unmatched, total: codesArray.length };
            setResults(data);
            saveRecentCheck(bondCodes, matched, pdfFileName);
            showAlert(matched.length ? '🎉 Match found!' : 'No match found', matched.length ? 'success' : 'error');
            setLoading(false);
        }, 700);
    }, [pdfContent, bondCodes, pdfFileName, showAlert, saveRecentCheck]);

    // === CLEAR RESULTS ===
    const clearResults = useCallback(() => setResults(null), []);

    // === CONDITIONAL RENDER ===
    const showInputSection = useMemo(() => !!pdfFileName && !!pdfContent, [pdfFileName, pdfContent]);

    return (
        <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
            {/* HEADER */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} text-white py-6 px-4 shadow-lg sticky top-0`}>
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex-1 text-center">
                        <h1 className="text-2xl md:text-4xl font-bold">🎟️ Prize Bond Checker</h1>
                        <p className="text-sm opacity-80">Check your bonds instantly — offline</p>
                    </div>
                    <button onClick={toggleDarkMode} className="p-3 rounded-full hover:bg-black/20 transition">
                        {darkMode ? '🌞' : '🌙'}
                    </button>
                </div>
            </div>

            {/* ALERT */}
            {alert && (
                <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[100] px-4 animate-slideDown">
                    <div
                        className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl border text-sm font-medium ${alert.type === 'success'
                            ? 'bg-green-50 border-green-400 text-green-800'
                            : alert.type === 'error'
                                ? 'bg-red-50 border-red-400 text-red-800'
                                : 'bg-blue-50 border-blue-400 text-blue-800'
                            }`}
                    >
                        {alert.type === 'success' ? <CheckCircle size={20} /> : alert.type === 'error' ? <XCircle size={20} /> : 'ℹ️'}
                        {alert.message}
                    </div>
                </div>
            )}

            <div className="max-w-4xl mx-auto p-6">
                {/* === PDF Upload === */}
                <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-xl border shadow-md p-6`}>
                    <h2 className="text-lg font-semibold mb-3">1️⃣ Upload Prize Bond List (PDF)</h2>
                    <label className="block cursor-pointer">
                        <div className={`border-2 border-dashed rounded-lg p-8 text-center ${darkMode ? 'border-gray-600 hover:border-blue-400 bg-gray-700' : 'border-gray-300 hover:border-blue-500 bg-blue-50'} transition`}>
                            <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" disabled={loading} />
                            <Upload className="mx-auto mb-3 text-gray-400" size={40} />
                            <p>{pdfFileName || 'Click to select PDF file'}</p>
                        </div>
                    </label>
                </div>

                {/* === Input Section (only show after PDF uploaded) === */}
                {showInputSection && (
                    <div
                        className={`mt-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-xl border shadow-md p-6 transition-all`}
                    >
                        <h2 className="text-lg font-semibold mb-3">2️⃣ Enter Your Bond Codes</h2>
                        <textarea
                            rows={6}
                            className={`w-full p-3 border rounded-lg resize-none focus:ring-2 ${darkMode
                                ? 'bg-gray-700 text-white border-gray-600 focus:ring-blue-400'
                                : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'
                                }`}
                            placeholder="e.g., 123456, ১২৩৪৫৬ or one code per line"
                            value={bondCodes}
                            onChange={(e) => setBondCodes(e.target.value)}
                        />
                        <button
                            onClick={checkBonds}
                            disabled={loading}
                            className={`w-full mt-4 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 ${loading ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            {loading ? <Loader className="animate-spin" size={22} /> : '🔍 Check My Bonds'}
                        </button>
                    </div>
                )}

                {/* === Results === */}
                {results && (
                    <div className="mt-6 transition-all">
                        {results.matched.length > 0 ? (
                            <div className="bg-green-50 border border-green-400 rounded-lg p-6 text-center">
                                <div className="text-5xl mb-4">🎉</div>
                                <h3 className="text-xl font-bold text-green-700">Congratulations!</h3>
                                <p className="text-green-600">You have {results.matched.length} winning code(s).</p>
                            </div>
                        ) : (
                            <div className="bg-red-50 border border-red-400 rounded-lg p-6 text-center">
                                <div className="text-5xl mb-4">❌</div>
                                <h3 className="text-xl font-bold text-red-700">No Match Found</h3>
                            </div>
                        )}

                        <button
                            onClick={clearResults}
                            className="w-full mt-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
                        >
                            Check Again
                        </button>
                    </div>
                )}

                {/* === History === */}
                {recentChecks.length > 0 && (
                    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-xl border mt-6 p-6 shadow-md`}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <History size={20} /> Recent Checks
                            </h2>
                            <button onClick={clearHistory} className="text-red-600 text-sm flex items-center gap-1">
                                <Trash2 size={14} /> Clear
                            </button>
                        </div>
                        {recentChecks.slice(0, 5).map((check) => (
                            <div
                                key={check.id}
                                onClick={() => loadRecentCheck(check)}
                                className="flex justify-between p-3 rounded-lg hover:bg-gray-100 cursor-pointer"
                            >
                                <div>
                                    <p className="text-sm font-medium">{check.pdfName}</p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(check.date).toLocaleString()}
                                    </p>
                                </div>
                                {check.hasMatch ? (
                                    <span className="text-green-600 text-sm flex items-center gap-1">
                                        <CheckCircle size={14} /> {check.matchCount}
                                    </span>
                                ) : (
                                    <span className="text-red-600 text-sm flex items-center gap-1">
                                        <XCircle size={14} /> 0
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PrizeBondChecker;
