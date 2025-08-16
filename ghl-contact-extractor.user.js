// ==UserScript==
// @name         GHL Contact Data Extractor - Enhanced
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  Extract contact data from GoHighLevel with robust phone extraction
// @author       AFH Insurance
// @match        https://app.gohighlevel.com/*
// @match        https://*.gohighlevel.com/*
// @icon         https://app.gohighlevel.com/favicon.ico
// @grant        GM_setClipboard
// @grant        GM_notification
// ==/UserScript==

(function() {
    'use strict';

    // ============= UTILITIES =============
    
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    function getInputValue(el) {
        if (!el) return '';
        
        // Handle various input types
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            return el.value || '';
        }
        
        // Handle contenteditable
        if (el.contentEditable === 'true' || el.getAttribute('contenteditable') === 'true') {
            return el.textContent || el.innerText || '';
        }
        
        // Handle select
        if (el.tagName === 'SELECT') {
            return el.options[el.selectedIndex]?.text || el.value || '';
        }
        
        // Default to text content
        return el.textContent || el.innerText || '';
    }
    
    function normPhone(str) {
        if (!str) return '';
        // Extract digits only
        const digits = str.replace(/\D/g, '');
        // Return formatted if we have 10+ digits
        if (digits.length >= 10) {
            return digits;
        }
        return '';
    }
    
    // ============= ENHANCED PHONE EXTRACTION =============
    
    function pickVisible(el) {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') return null;
        if (rect.width === 0 || rect.height === 0) return null;
        return el;
    }
    
    function firstNonEmpty(arr, pickText = false) {
        for (const el of arr) {
            if (!el) continue;
            const node = pickVisible(el);
            if (!node) continue;
            const v = pickText ? (node.textContent || '').trim() : getInputValue(node);
            if (v) return { el: node, value: v };
        }
        return { el: null, value: '' };
    }
    
    // ============= MAIN DATA COLLECTION =============
    
    async function collectContactData() {
        console.log('[GHL Extractor] Starting data collection...');
        
        // Give dynamic masks a moment to hydrate
        for (let i = 0; i < 8; i++) {
            const ph = document.querySelector('input[inputmode="tel"], input[type="tel"], input[name*="phone" i], [contenteditable="true"][aria-label*="phone" i]');
            if (ph && getInputValue(ph)) break;
            await sleep(120);
        }
        
        // Extract first name
        const firstNameEl = document.querySelector(
            'input[name="first_name"], input[name="firstName"], ' +
            'input[placeholder*="First" i], input[aria-label*="First Name" i], ' +
            '[contenteditable="true"][aria-label*="First Name" i]'
        );
        const firstName = getInputValue(firstNameEl) || '';
        
        // Extract last name
        const lastNameEl = document.querySelector(
            'input[name="last_name"], input[name="lastName"], ' +
            'input[placeholder*="Last" i], input[aria-label*="Last Name" i], ' +
            '[contenteditable="true"][aria-label*="Last Name" i]'
        );
        const lastName = getInputValue(lastNameEl) || '';
        
        // Extract email
        const emailEl = document.querySelector(
            'input[type="email"], input[name="email"], ' +
            'input[placeholder*="email" i], input[aria-label*="email" i], ' +
            '[contenteditable="true"][aria-label*="email" i]'
        );
        const email = getInputValue(emailEl) || '';
        
        // ---------------- Phone extraction (robust) ----------------
        
        // 1) Common masked / CE selectors
        const phoneCandidates = [
            // masked inputs often are type="text" + inputmode="tel"
            'input[inputmode="tel"]',
            'input[name="phone"]',
            'input[name*="phone" i]',
            'input[type="tel"]',
            '[aria-label*="phone" i]',
            '[placeholder*="phone" i]',
            '[data-testid*="phone" i]',
            // possible contenteditable variants
            'div[contenteditable="true"][aria-label*="phone" i]',
            'div[contenteditable="true"][data-field*="phone" i]',
        ];
        
        let phonePick = firstNonEmpty(phoneCandidates.map(s => document.querySelector(s)));
        let phone = normPhone(phonePick.value);
        
        // 2) XPath fallback: find a "Phone/Phone Number/Mobile" label-like text then take next input/CE
        if (!phone) {
            const xp = document.evaluate(
                "(" +
                "//div[normalize-space()='Phone' or normalize-space()='Phone Number' or normalize-space()='Mobile']" +
                " | //span[normalize-space()='Phone' or normalize-space()='Phone Number' or normalize-space()='Mobile']" +
                " | //label[normalize-space()='Phone' or normalize-space()='Phone Number' or normalize-space()='Mobile']" +
                ")[1]",
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            ).singleNodeValue;
            
            if (xp) {
                const next = document.evaluate(
                    ".//following::input[1] | .//following::*[@contenteditable='true'][1]",
                    xp,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                ).singleNodeValue;
                const v = getInputValue(next);
                phonePick = { el: next || null, value: v || '' };
                phone = normPhone(v || '');
            }
        }
        
        // 3) Last-chance: look for any input where its accessible name hints "phone" and has 10+ digits
        if (!phone) {
            const allInputs = Array.from(document.querySelectorAll('input, [contenteditable="true"]'));
            for (const el of allInputs) {
                const label = (el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || '').toLowerCase();
                if (label.includes('phone')) {
                    const v = getInputValue(el);
                    const digits = (v || '').replace(/\D/g, '');
                    if (digits.length >= 10) {
                        phonePick = { el, value: v };
                        phone = normPhone(v);
                        break;
                    }
                }
            }
        }
        
        // DEBUG: visualize which node was used for phone extraction
        (function debugPhone(el, value) {
            if (!el) return;
            try {
                const box = document.createElement('div');
                const r = el.getBoundingClientRect();
                box.style.position = 'fixed';
                box.style.left = r.left + 'px';
                box.style.top = r.top + 'px';
                box.style.width = r.width + 'px';
                box.style.height = r.height + 'px';
                box.style.pointerEvents = 'none';
                box.style.border = '2px solid #10b981'; // green
                box.style.zIndex = 2147483647;
                box.style.borderRadius = '6px';
                document.body.appendChild(box);
                setTimeout(() => box.remove(), 1500);
                console.info('[GHL Extractor] Phone element:', el, '→ value:', value);
            } catch {}
        })(phonePick.el, phone);
        
        // Extract ZIP (optional)
        const zipEl = document.querySelector(
            'input[name="zip"], input[name="postal_code"], input[name="postalCode"], ' +
            'input[placeholder*="zip" i], input[aria-label*="zip" i], ' +
            '[contenteditable="true"][aria-label*="zip" i]'
        );
        const zip = getInputValue(zipEl) || '';
        
        // Get contact ID from URL
        const contactId = (location.pathname.match(/\/contacts\/detail\/([A-Za-z0-9\-]+)/i) || [])[1] || null;
        const contactUrl = location.href;
        
        // Sanitize data
        const safeEmail = email.toLowerCase().trim();
        const safePhone = phone; // Already normalized
        const safeZip = zip.replace(/\D/g, '').substring(0, 5);
        
        console.log('[GHL Extractor] Collected data:', {
            firstName,
            lastName,
            email: safeEmail,
            phone: safePhone,
            zip: safeZip,
            contactId,
            contactUrl
        });
        
        return {
            firstName,
            lastName,
            email: safeEmail,
            phone: safePhone,
            zip: safeZip,
            contactId,
            contactUrl
        };
    }
    
    // ============= UI BUTTON =============
    
    function createButton() {
        const existingBtn = document.getElementById('ghl-copy-btn');
        if (existingBtn) return;
        
        const btn = document.createElement('button');
        btn.id = 'ghl-copy-btn';
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy → Intake</span>
        `;
        
        Object.assign(btn.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '10px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            zIndex: '9999',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s'
        });
        
        btn.addEventListener('mouseenter', () => {
            btn.style.backgroundColor = '#059669';
            btn.style.transform = 'scale(1.05)';
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.backgroundColor = '#10b981';
            btn.style.transform = 'scale(1)';
        });
        
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.querySelector('span').textContent = 'Extracting...';
            
            try {
                const data = await collectContactData();
                const jsonStr = JSON.stringify(data);
                
                // Copy to clipboard
                if (typeof GM_setClipboard !== 'undefined') {
                    GM_setClipboard(jsonStr, 'text');
                } else {
                    await navigator.clipboard.writeText(jsonStr);
                }
                
                // Success feedback
                btn.style.backgroundColor = '#059669';
                btn.querySelector('span').textContent = 'Copied!';
                
                // Show notification
                if (typeof GM_notification !== 'undefined') {
                    GM_notification({
                        text: `Contact data copied: ${data.firstName} ${data.lastName}`,
                        title: 'GHL Contact Extracted',
                        timeout: 3000
                    });
                } else {
                    console.log('[GHL Extractor] Contact data copied to clipboard:', data);
                }
                
                setTimeout(() => {
                    btn.querySelector('span').textContent = 'Copy → Intake';
                    btn.style.backgroundColor = '#10b981';
                }, 2000);
                
            } catch (error) {
                console.error('[GHL Extractor] Error:', error);
                btn.style.backgroundColor = '#dc2626';
                btn.querySelector('span').textContent = 'Error!';
                
                setTimeout(() => {
                    btn.querySelector('span').textContent = 'Copy → Intake';
                    btn.style.backgroundColor = '#10b981';
                }, 2000);
            } finally {
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        });
        
        document.body.appendChild(btn);
    }
    
    // ============= INITIALIZATION =============
    
    function init() {
        // Wait for page to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createButton);
        } else {
            createButton();
        }
        
        // Re-create button on navigation
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                setTimeout(createButton, 1000);
            }
        }).observe(document, { subtree: true, childList: true });
    }
    
    init();
    
})();