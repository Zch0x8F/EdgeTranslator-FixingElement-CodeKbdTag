const contentScript = (function () {
    'use strict';

    let isTranslationActive = false; // Trạng thái dịch

    const REQUIRED_STYLES = [
        'background-color',
        'border-radius',
        'border',
        'box-shadow',
        'color',
        'display',
        'font-size',
        'font-family',
        'font-weight',
        'line-height',
        'padding',
        'margin',
        'white-space'];

    function processNodeAndChild(node) {
        if (node.nodeType !== 1) return;

        const elements = node.querySelectorAll('code, kbd');
        const updates = [];

        // Batch reads: collect styles and info for valid elements
        elements.forEach(el => {
            if (el.children.length === 0) {
                const computedStyle = window.getComputedStyle(el);
                const styles = {};

                REQUIRED_STYLES.forEach(style => {
                    styles[style] = computedStyle.getPropertyValue(style);
                });

                updates.push({
                    el,
                    styles,
                    innerHTML: el.innerHTML,
                    tagName: el.tagName
                });
            }
        });

        // Batch writes: perform the replacements
        updates.forEach(update => {
            if (!update.el.parentNode) return;

            const spanNode = document.createElement('span');

            // Apply collected styles
            for (const style in update.styles) {
                spanNode.style[style] = update.styles[style];
            }

            spanNode.innerHTML = update.innerHTML;

            if (update.tagName === 'KBD') {
                spanNode.style.whiteSpace = 'nowrap';
                spanNode.style.width = 'auto';
                spanNode.style.maxWidth = '100%';
            }

            update.el.parentNode.replaceChild(spanNode, update.el);
        });
    }

    // Theo dõi <title> thay dđổi để phát hiện khi trang bắt đầu dịch hoặc dịch xong
    const titleObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === '_msttexthash') {
                const isCurrentlyTranslated = mutation.target.hasAttribute('_msttexthash');
                if (isCurrentlyTranslated && !isTranslationActive) {
                    isTranslationActive = true;
                    processNodeAndChild(document.body);
                    const contentObserver = new MutationObserver(function (mutations) {
                        mutations.forEach(function (mutation) {
                            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                                if (mutation.target.querySelector && mutation.target.querySelector('code, kbd')) {
                                    processNodeAndChild(mutation.target);
                                }
                            }
                        });
                    });
                    contentObserver.observe(document.body, {
                        childList: true,
                        subtree: true,
                        characterData: true
                    });

                    // Dừng khi dịch xong
                    const stopTranslationObserver = new MutationObserver(function (stopMutations) {
                        stopMutations.forEach(function (stopMutation) {
                            if (!mutation.target.hasAttribute('_msttexthash')) {
                                contentObserver.disconnect();
                                stopTranslationObserver.disconnect();
                                isTranslationActive = false;
                                titleObserver.disconnect();
                            }
                        });
                    });

                    stopTranslationObserver.observe(mutation.target, {
                        attributes: true,
                        attributeFilter: ['_msttexthash']
                    });

                }
            }
        });
    });

    function init() {
        const titleTag = document.querySelector('head > title');
        if (titleTag) {
            titleObserver.observe(titleTag, {
                attributes: true
            });
        }
    }

    if (typeof module === 'undefined') {
        init();
    }

    return {
        replaceTagToSpan,
        processNodeAndChild,
        init,
        getIsTranslationActive: () => isTranslationActive,
        setIsTranslationActive: (val) => { isTranslationActive = val; }
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = contentScript;
}
