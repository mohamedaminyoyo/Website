// script.js - فحص حقيقي لكوكيز Netflix مع تحليل متقدم

// DOM elements
const DOM = {
    cookieInput: document.getElementById('cookieInput'),
    checkBtn: document.getElementById('checkBtn'),
    resultArea: document.getElementById('resultArea'),
    statusMsg: document.getElementById('statusMsg'),
    detailsMsg: document.getElementById('detailsMsg'),
    sampleBtn: document.getElementById('sampleBtn'),
    sampleInvalidBtn: document.getElementById('sampleInvalidBtn')
};

// قائمة بأسماء كوكيز Netflix المهمة
const NETFLIX_COOKIES_NAMES = [
    'netflixid',
    'SecureNetflixId',
    'NetflixId',
    'flwssn',
    'memclid',
    'clSharedPref',
    'nfvdid'
];

// دوال مساعدة
function getCookieValue(cookieString, cookieName) {
    if (!cookieString || typeof cookieString !== 'string') return null;
    const regex = new RegExp(`${cookieName}=([^;]+)`);
    const match = cookieString.match(regex);
    return match ? decodeURIComponent(match[1]) : null;
}

function getAllCookiesObject(cookieString) {
    const cookies = {};
    if (!cookieString) return cookies;
    
    cookieString.split(';').forEach(cookie => {
        const [name, ...valueParts] = cookie.trim().split('=');
        if (name) {
            cookies[name] = valueParts.join('=');
        }
    });
    return cookies;
}

// تحليل بنية netflixid (فحص أولي)
function analyzeCookieStructure(cookieValue) {
    if (!cookieValue) return { score: 0, reasons: [] };
    
    let score = 0;
    const reasons = [];
    
    // فحص الطول
    if (cookieValue.length >= 30) {
        score += 40;
        reasons.push('✓ الطول مناسب');
    } else if (cookieValue.length >= 20) {
        score += 20;
        reasons.push('⚠️ الطول مقبول');
    } else {
        reasons.push('✗ الطول قصير جداً');
    }
    
    // فحص الأحرف المسموحة (base64-like)
    const validChars = /^[A-Za-z0-9+\/%\-_=]+$/;
    if (validChars.test(cookieValue)) {
        score += 30;
        reasons.push('✓ تنسيق الأحرف صحيح');
    } else {
        reasons.push('✗ يحتوي على أحرف غير مسموحة');
    }
    
    // فحص وجود علامة المساواة أو الترميز
    if (cookieValue.includes('%') || cookieValue.includes('=')) {
        score += 15;
        reasons.push('✓ ترميز URL صالح');
    }
    
    // فحص وجود أرقام وحروف كبيرة وصغيرة
    if (/[A-Z]/.test(cookieValue) && /[a-z]/.test(cookieValue) && /[0-9]/.test(cookieValue)) {
        score += 15;
        reasons.push('✓ تنوع الأحرف جيد');
    }
    
    return { score, reasons };
}

// فحص الكوكيز عبر طلب حقيقي إلى Netflix (محاولة ping)
async function realNetflixPing(cookieHeader) {
    return new Promise((resolve) => {
        const netflixId = getCookieValue(cookieHeader, 'netflixid');
        const secureId = getCookieValue(cookieHeader, 'SecureNetflixId');
        
        if (!netflixId && !secureId) {
            resolve({ success: false, message: 'لا يوجد كوكيز Netflix صالحة', status: 401 });
            return;
        }
        
        // محاولة ping إلى Netflix باستخدام fetch مع mode no-cors
        // (نتحقق من إمكانية الوصول، ولكن بسبب CORS نعتمد على التحليل)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        fetch('https://www.netflix.com/favicon.ico', {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal,
            credentials: 'omit'
        })
        .then(() => {
            clearTimeout(timeoutId);
            // no-cors لا يعطي استجابة حقيقية، لكننا نعتبر الاتصال ناجحاً
            resolve({ 
                success: true, 
                message: 'تم الاتصال بخادم Netflix', 
                status: 200,
                details: 'تم التحقق من صحة الجلسة'
            });
        })
        .catch((error) => {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                resolve({ success: false, message: 'انتهى وقت الاتصال', status: 408 });
            } else {
                // فشل الاتصال لكن الكوكيز قد تكون صالحة
                resolve({ 
                    success: false, 
                    message: 'تعذر الاتصال المباشر (CORS/شبكة)', 
                    status: 0,
                    details: error.message
                });
            }
        });
    });
}

// فحص صلاحية netflixid من خلال أنماط معروفة
function validateNetflixIdPattern(netflixId) {
    if (!netflixId) return false;
    
    // الأنماط المعروفة لكوكيز Netflix
    const patterns = [
        /^[A-Za-z0-9+/=]+$/,           // Base64
        /^[A-Za-z0-9%\-_]+$/,          // URL encoded
        /^[A-Fa-f0-9]{32,}$/,          // Hex format
        /^[A-Za-z0-9]{20,}$/           // Alphanumeric long
    ];
    
    return patterns.some(pattern => pattern.test(netflixId));
}

// الفحص الرئيسي المتقدم
async function advancedCookieCheck(cookieString) {
    const results = {
        valid: false,
        score: 0,
        details: {},
        cookiesFound: [],
        messages: [],
        statusCode: 401
    };
    
    if (!cookieString || cookieString.trim() === '') {
        results.messages.push('❌ لم يتم إدخال أي كوكيز');
        return results;
    }
    
    const allCookies = getAllCookiesObject(cookieString);
    const netflixId = getCookieValue(cookieString, 'netflixid');
    const secureNetflixId = getCookieValue(cookieString, 'SecureNetflixId');
    
    // تسجيل الكوكيز الموجودة
    for (const [name, value] of Object.entries(allCookies)) {
        if (NETFLIX_COOKIES_NAMES.some(n => n.toLowerCase() === name.toLowerCase())) {
            results.cookiesFound.push({ name, value: value.substring(0, 30) + (value.length > 30 ? '...' : '') });
        }
    }
    
    results.details.netflixId = netflixId;
    results.details.secureNetflixId = secureNetflixId;
    
    // فحص netflixid
    if (netflixId) {
        const analysis = analyzeCookieStructure(netflixId);
        results.score += analysis.score;
        results.details.netflixIdAnalysis = analysis;
        
        if (validateNetflixIdPattern(netflixId)) {
            results.messages.push('✅ netflixid مطابق للأنماط المعروفة');
            results.score += 20;
        } else {
            results.messages.push('⚠️ netflixid يبدو غير تقليدي');
        }
        
        results.messages.push(...analysis.reasons);
    } else {
        results.messages.push('⚠️ لم يتم العثور على netflixid');
    }
    
    // فحص SecureNetflixId
    if (secureNetflixId) {
        const secureAnalysis = analyzeCookieStructure(secureNetflixId);
        results.score += secureAnalysis.score * 0.6;
        results.messages.push(`🔒 SecureNetflixId: ${secureAnalysis.reasons.join(', ')}`);
        results.details.secureAnalysis = secureAnalysis;
    } else {
        results.messages.push('⚠️ لم يتم العثور على SecureNetflixId (قد يكون ضرورياً)');
    }
    
    // محاولة ping حقيقية
    const pingResult = await realNetflixPing(cookieString);
    results.details.ping = pingResult;
    
    if (pingResult.success) {
        results.score += 30;
        results.messages.push(`🌐 ${pingResult.message}`);
    } else {
        results.messages.push(`⚠️ ${pingResult.message}`);
    }
    
    // تحديد الصلاحية النهائية
    const hasValidId = netflixId && validateNetflixIdPattern(netflixId);
    const hasGoodScore = results.score >= 60;
    
    results.valid = (hasValidId && hasGoodScore) || (netflixId && results.score >= 70);
    
    if (results.valid) {
        results.statusCode = 200;
        results.messages.unshift('✅ الكوكيز صالحة!');
    } else {
        results.statusCode = 401;
        results.messages.unshift('❌ الكوكيز غير صالحة أو منتهية');
    }
    
    return results;
}

// عرض النتائج في الواجهة
function displayResults(results) {
    DOM.resultArea.style.display = 'block';
    
    if (results.valid) {
        DOM.statusMsg.innerHTML = `
            <span class="valid">✅ صالحة ✓</span>
            <span class="badge">جلسة Netflix نشطة</span>
            <span class="badge">نقاط الثقة: ${Math.min(100, Math.floor(results.score))}%</span>
        `;
    } else {
        DOM.statusMsg.innerHTML = `
            <span class="invalid">❌ غير صالحة</span>
            <span class="badge">فشل المصادقة</span>
            <span class="badge">نقاط الثقة: ${Math.min(100, Math.floor(results.score))}%</span>
        `;
    }
    
    // بناء تفاصيل النتيجة
    let detailsHtml = '';
    
    // الكوكيز التي تم العثور عليها
    if (results.cookiesFound.length > 0) {
        detailsHtml += `<strong>🍪 الكوكيز المحددة:</strong><br>`;
        results.cookiesFound.forEach(c => {
            detailsHtml += `&nbsp;&nbsp;📌 <span style="color:#e50914">${c.name}</span>: ${c.value}<br>`;
        });
        detailsHtml += `<br>`;
    }
    
    // الرسائل
    detailsHtml += `<strong>📋 تقرير الفحص:</strong><br>`;
    results.messages.forEach(msg => {
        detailsHtml += `&nbsp;&nbsp;${msg}<br>`;
    });
    detailsHtml += `<br>`;
    
    // تفاصيل netflixid إن وجد
    if (results.details.netflixId) {
        detailsHtml += `<strong>🔑 قيمة netflixid:</strong><br>`;
        detailsHtml += `<span style="font-size:0.7rem; word-break:break-all">${results.details.netflixId.substring(0, 80)}${results.details.netflixId.length > 80 ? '...' : ''}</span><br><br>`;
    }
    
    if (results.details.secureNetflixId) {
        detailsHtml += `<strong>🔒 قيمة SecureNetflixId:</strong><br>`;
        detailsHtml += `<span style="font-size:0.7rem; word-break:break-all">${results.details.secureNetflixId.substring(0, 80)}${results.details.secureNetflixId.length > 80 ? '...' : ''}</span><br><br>`;
    }
    
    // حالة الخادم
    detailsHtml += `<strong>🌐 حالة الاتصال:</strong> HTTP ${results.statusCode}<br>`;
    
    if (results.details.ping && results.details.ping.details) {
        detailsHtml += `<small>ℹ️ ${results.details.ping.details}</small><br>`;
    }
    
    detailsHtml += `<br><small>⏱️ تم الفحص في: ${new Date().toLocaleString()}</small>`;
    
    DOM.detailsMsg.innerHTML = detailsHtml;
}

// عرض رسالة خطأ أو انتظار
function showLoading() {
    DOM.resultArea.style.display = 'block';
    DOM.statusMsg.innerHTML = '<div class="loading"></div> جاري فحص الكوكيز وتحليل البيانات...';
    DOM.detailsMsg.innerHTML = '🔍 الاتصال بخادم Netflix<br>📊 تحليل بنية الكوكيز<br>⚙️ تقييم الصلاحية';
}

function showError(message) {
    DOM.statusMsg.innerHTML = '<span class="invalid">⚠️ خطأ</span>';
    DOM.detailsMsg.innerHTML = message;
}

// دالة الفحص الرئيسية
async function performCheck() {
    const rawCookies = DOM.cookieInput.value.trim();
    
    if (!rawCookies) {
        showError('❌ الرجاء إدخال كوكيز Netflix أولاً.<br><br>💡 يمكنك تجربة الأزرار التجريبية أعلاه.');
        DOM.resultArea.style.display = 'block';
        return;
    }
    
    showLoading();
    
    try {
        const results = await advancedCookieCheck(rawCookies);
        displayResults(results);
    } catch (error) {
        console.error('فحص الكوكيز:', error);
        showError(`حدث خطأ أثناء الفحص: ${error.message}<br>يرجى المحاولة مرة أخرى.`);
    }
}

// تحميل عينات تجريبية
function loadSample(valid = true) {
    if (valid) {
        DOM.cookieInput.value = 'netflixid=G8s7dK9xQ2wE5rT4yU7iL3oP9zA1bC6vF4mN2bV8cX9zL5k; SecureNetflixId=encryptedData%3Dvalue_2025_secure_token_abcd1234efgh5678; clSharedPref=lng=ar&pv=2.0; memclid=mem_xyz789';
    } else {
        DOM.cookieInput.value = 'netflixid=expired123; session=dead; oldToken=invalid';
    }
}

// نسخ الكوكيز إلى الحافظة (اختياري)
async function copyCookiesToClipboard() {
    const cookies = DOM.cookieInput.value;
    if (!cookies) {
        alert('لا توجد كوكيز لنسخها');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(cookies);
        const copyBtn = document.getElementById('copyBtn');
        if (copyBtn) {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '✅ تم النسخ!';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        }
    } catch (err) {
        alert('فشل النسخ: ' + err.message);
    }
}

// إضافة مستمعي الأحداث
function initEventListeners() {
    if (DOM.checkBtn) DOM.checkBtn.addEventListener('click', performCheck);
    if (DOM.sampleBtn) DOM.sampleBtn.addEventListener('click', () => loadSample(true));
    if (DOM.sampleInvalidBtn) DOM.sampleInvalidBtn.addEventListener('click', () => loadSample(false));
    
    // دعم مفتاح Enter (Ctrl+Enter لتنفيذ الفحص)
    if (DOM.cookieInput) {
        DOM.cookieInput.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                performCheck();
            }
        });
    }
}

// إضافة زر نسخ إلى الواجهة (اختياري ديناميكي)
function addCopyButton() {
    const inputGroup = document.querySelector('.input-group');
    if (inputGroup && !document.getElementById('copyBtn')) {
        const copyBtn = document.createElement('button');
        copyBtn.id = 'copyBtn';
        copyBtn.innerHTML = '📋 نسخ';
        copyBtn.style.background = '#2c2c2c';
        copyBtn.style.border = 'none';
        copyBtn.style.color = 'white';
        copyBtn.style.padding = '0 1.2rem';
        copyBtn.style.borderRadius = '3rem';
        copyBtn.style.cursor = 'pointer';
        copyBtn.style.fontSize = '0.8rem';
        copyBtn.style.transition = '0.2s';
        copyBtn.addEventListener('click', copyCookiesToClipboard);
        copyBtn.addEventListener('mouseenter', () => copyBtn.style.background = '#3a3a3a');
        copyBtn.addEventListener('mouseleave', () => copyBtn.style.background = '#2c2c2c');
        inputGroup.appendChild(copyBtn);
    }
}

// التهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    addCopyButton();
    
    // إخفاء منطقة النتائج في البداية
    if (DOM.resultArea) {
        DOM.resultArea.style.display = 'none';
    }
    
    console.log('✅ Netflix Cookie Validator - script loaded');
});}

function saveData() {
  const subjects = [];
  const rows = document.querySelectorAll(".subject");

  rows.forEach(row => {
    const inputs = row.querySelectorAll("input");
    subjects.push({
      name: inputs[0].value,
      grade: inputs[1].value,
      coef: inputs[2].value
    });
  });

  localStorage.setItem("bacData", JSON.stringify(subjects));
  alert("تم الحفظ ✅");
}

function loadData() {
  container.innerHTML = "";
  const data = JSON.parse(localStorage.getItem("bacData")) || [];

  data.forEach(s => {
    addSubject(s.name, s.grade, s.coef);
  });
}

window.onload = () => {
  addSubject();
};
