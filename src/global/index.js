function getPageSlug() {
    var path = location.pathname.replace(/^\/+|\/+$/g, '');
    var slug = path.split('/').pop() || '';
    return slug.replace(/\.html$/, '');
}

function createReferenceUrls(slug) {
    var sourcePath = 'src/pages/' + encodeURIComponent(slug) + '/index.html';

    return {
        source: 'https://github.com/baealex/design-lab/blob/main/' + sourcePath,
        raw: 'https://raw.githubusercontent.com/baealex/design-lab/main/' + sourcePath,
    };
}

function createAiPrompt(slug, urls) {
    var isConcept = slug.indexOf('concept-') === 0;
    var referenceType = isConcept ? 'Original concept study' : 'Design trend study';
    var contentFlow = isConcept
        ? 'Premise → Rules → Working Example → Limits'
        : 'Context → Principles → Working Example → Keep / Improve';
    var guardrails = isConcept
        ? 'Limits, plus What This Is Not when the source includes it'
        : 'the distinction between what to keep and what to improve';
    var categoryRule = isConcept
        ? 'Do not present this original concept as an established trend. Keep its hypothesis and limits explicit.'
        : 'Translate the historical visual language into the current context without reproducing its usability problems.';

    return [
        'Use the following GitHub source as a design reference and turn its core ideas into an implementation guide for my project.',
        '',
        'Reference: ' + document.title,
        'Type: ' + referenceType,
        'GitHub source: ' + urls.source,
        'Raw source: ' + urls.raw,
        '',
        'How to work:',
        '1. Read the source through its ' + contentFlow + ' flow. Briefly summarize the problem it addresses and its core concept.',
        '2. Do not copy its colors, effects, or layout literally. Translate them into reusable rules for hierarchy, states, and interaction.',
        '3. Treat ' + guardrails + ' as implementation constraints, not optional footnotes.',
        '4. ' + categoryRule,
        '5. Do not invent meaningless metrics, progress bars, filler icons, repetitive cards, or controls that look interactive but do nothing.',
        '6. Make every visible control work. Preserve mobile usability, keyboard focus, clear state copy, and prefers-reduced-motion.',
        '7. If my product context is incomplete, ask up to three essential questions before implementation.',
        '',
        'Return the result as: Core concept / Use / Avoid / Screen structure and behavior / Implementation order.',
        'If you cannot access the source, do not guess. Ask me to provide the file contents.',
    ].join('\n');
}

function copyText(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function' && window.isSecureContext) {
        try {
            return Promise.resolve(navigator.clipboard.writeText(text));
        } catch (error) {
            return Promise.reject(error);
        }
    }

    return new Promise(function(resolve, reject) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            if (!document.execCommand('copy')) {
                throw new Error('Copy command failed');
            }
            resolve();
        } catch (error) {
            reject(error);
        } finally {
            document.body.removeChild(textarea);
        }
    });
}

function initializePageTools() {
    if (self !== top) return;

    var slug = getPageSlug();
    if (slug.indexOf('design-') !== 0 && slug.indexOf('concept-') !== 0) return;

    var pageTools = document.getElementById('page-tools');
    var viewCode = document.getElementById('view-code');
    var copyPrompt = document.getElementById('copy-prompt');
    var copyLabel = document.getElementById('copy-prompt-label');
    var promptEditor = document.getElementById('prompt-editor');
    var promptSurface = promptEditor && promptEditor.querySelector('.prompt-sheet__surface');
    var promptClose = document.getElementById('prompt-editor-close');
    var promptContent = document.getElementById('prompt-editor-content');
    var promptCount = document.getElementById('prompt-editor-count');
    var promptReset = document.getElementById('prompt-editor-reset');
    var promptCopy = document.getElementById('prompt-editor-copy');
    var promptCopyLabel = document.getElementById('prompt-editor-copy-label');
    var promptStatus = document.getElementById('prompt-editor-status');
    if (!pageTools || !viewCode || !copyPrompt || !copyLabel || !promptEditor || !promptSurface || !promptClose || !promptContent || !promptCount || !promptReset || !promptCopy || !promptCopyLabel || !promptStatus) return;

    var urls = createReferenceUrls(slug);
    var defaultPrompt = createAiPrompt(slug, urls);
    var resetTimer;

    viewCode.setAttribute('href', urls.source);
    promptContent.value = defaultPrompt;
    pageTools.hidden = false;

    function updateCount() {
        promptCount.textContent = promptContent.value.length.toLocaleString('en-US') + ' chars';
    }

    function resetCopyFeedback() {
        delete copyPrompt.dataset.state;
        delete promptCopy.dataset.state;
        copyLabel.textContent = 'COPY PROMPT';
        promptCopyLabel.textContent = 'COPY';
    }

    function scheduleFeedbackReset() {
        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(resetCopyFeedback, 1800);
    }

    function closeEditor() {
        if (typeof promptEditor.close === 'function') {
            promptEditor.close();
        } else {
            promptEditor.removeAttribute('open');
            copyPrompt.focus();
        }
    }

    function openEditor() {
        promptStatus.textContent = '';
        if (typeof promptEditor.showModal === 'function') {
            if (!promptEditor.open) promptEditor.showModal();
        } else {
            promptEditor.setAttribute('open', '');
        }
        promptEditor.focus();
    }

    function copyEditedPrompt() {
        if (!promptContent.value.trim()) {
            promptCopy.dataset.state = 'error';
            promptCopyLabel.textContent = 'EMPTY';
            promptStatus.textContent = 'Add some prompt text before copying.';
            promptContent.focus();
            scheduleFeedbackReset();
            return;
        }

        copyText(promptContent.value).then(function() {
            copyPrompt.dataset.state = 'copied';
            promptCopy.dataset.state = 'copied';
            copyLabel.textContent = 'COPIED';
            promptCopyLabel.textContent = 'COPIED';
            promptStatus.textContent = 'Edited prompt copied to clipboard.';
        }).catch(function() {
            promptCopy.dataset.state = 'error';
            promptCopyLabel.textContent = 'TRY AGAIN';
            promptStatus.textContent = 'Could not copy the edited prompt.';
        }).then(function() {
            scheduleFeedbackReset();
        });
    }

    updateCount();

    copyPrompt.addEventListener('click', openEditor);
    promptClose.addEventListener('click', closeEditor);
    promptCopy.addEventListener('click', copyEditedPrompt);

    promptReset.addEventListener('click', function() {
        promptContent.value = defaultPrompt;
        resetCopyFeedback();
        updateCount();
        promptStatus.textContent = 'Prompt restored to the original template.';
        promptContent.focus();
    });

    promptContent.addEventListener('input', function() {
        resetCopyFeedback();
        updateCount();
        promptStatus.textContent = '';
    });

    promptEditor.addEventListener('keydown', function(event) {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            copyEditedPrompt();
        }
    });

    promptEditor.addEventListener('click', function(event) {
        if (event.target !== promptEditor) return;

        var rect = promptSurface.getBoundingClientRect();
        var isOutside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
        if (isOutside) closeEditor();
    });

    promptEditor.addEventListener('close', function() {
        copyPrompt.focus();
    });
}

initializePageTools();
