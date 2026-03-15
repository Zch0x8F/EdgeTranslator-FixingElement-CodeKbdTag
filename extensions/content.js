(function () {
    'use strict';

    let isTranslationActive = false; // Trạng thái dịch

    // Hàm thay thế thẻ <code> hoặc <kbd> bằng <span>
    function replaceTagToSpan(node) {
        if ((node.tagName === 'CODE' || node.tagName === 'KBD') && node.nodeType === 1 && node.children.length === 0) {
            const spanNode = document.createElement('span');
            const computedStyle = window.getComputedStyle(node);

            // Chỉ lấy các thuộc tính CSS cần thiết
            const requiredStyles = [
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
                'color',
                'white-space'];
            requiredStyles.forEach(style => {
                spanNode.style[style] = computedStyle.getPropertyValue(style);
            });

            spanNode.innerHTML = node.innerHTML;

            if (node.tagName === 'KBD') {
                spanNode.style.whiteSpace = 'nowrap';
                spanNode.style.width = 'auto';
                spanNode.style.maxWidth = '100%';
            }

            node.parentNode.replaceChild(spanNode, node);
        }
    }

    function processNodeAndChild(node) {
        if (node.nodeType === 1) {
            node.querySelectorAll('code, kbd').forEach(replaceTagToSpan);
        }
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
                                if (mutation.target.querySelector && (mutation.target.querySelector('code') || mutation.target.querySelector('kbd'))) {
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

    const titleTag = document.querySelector('head > title');
    if (titleTag) {
        titleObserver.observe(titleTag, {
            attributes: true
        });
    }

})();