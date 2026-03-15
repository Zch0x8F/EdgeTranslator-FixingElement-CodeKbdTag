const contentScript = require('../extensions/content.js');

describe('Content Script', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.head.innerHTML = '<title>Test Page</title>';
        contentScript.setIsTranslationActive(false);
    });

    describe('replaceTagToSpan', () => {
        test('should replace <code> tag with <span> and copy styles', () => {
            const code = document.createElement('code');
            code.innerHTML = 'test code';
            code.style.backgroundColor = 'red';
            document.body.appendChild(code);

            // Mock getComputedStyle
            window.getComputedStyle = jest.fn().mockReturnValue({
                getPropertyValue: (prop) => code.style[prop] || 'none'
            });

            contentScript.replaceTagToSpan(code);

            const span = document.querySelector('span');
            expect(span).not.toBeNull();
            expect(span.innerHTML).toBe('test code');
            expect(span.style.backgroundColor).toBe('red');
            expect(document.querySelector('code')).toBeNull();
        });

        test('should replace <kbd> tag and set nowrap style', () => {
            const kbd = document.createElement('kbd');
            kbd.innerHTML = 'Ctrl+C';
            document.body.appendChild(kbd);

            window.getComputedStyle = jest.fn().mockReturnValue({
                getPropertyValue: () => 'none'
            });

            contentScript.replaceTagToSpan(kbd);

            const span = document.querySelector('span');
            expect(span).not.toBeNull();
            expect(span.style.whiteSpace).toBe('nowrap');
        });

        test('should NOT replace tag if it has children', () => {
            const code = document.createElement('code');
            code.innerHTML = '<span>nested</span>';
            document.body.appendChild(code);

            contentScript.replaceTagToSpan(code);

            expect(document.querySelector('code')).not.toBeNull();
            expect(document.querySelector('span')).not.toBeNull(); // The nested span
        });
    });

    describe('processNodeAndChild', () => {
        test('should process all code and kbd tags in a node', () => {
            document.body.innerHTML = `
                <div>
                    <code>code1</code>
                    <kbd>kbd1</kbd>
                    <p>text</p>
                </div>
            `;

            window.getComputedStyle = jest.fn().mockReturnValue({
                getPropertyValue: () => 'none'
            });

            contentScript.processNodeAndChild(document.body);

            expect(document.querySelectorAll('span').length).toBe(2);
            expect(document.querySelectorAll('code').length).toBe(0);
            expect(document.querySelectorAll('kbd').length).toBe(0);
        });
    });

    describe('MutationObserver logic', () => {
        test('should trigger processing when _msttexthash is added to title', (done) => {
            const title = document.querySelector('title');

            // Re-initialize to attach observer to our new title
            contentScript.init();

            document.body.innerHTML = '<code>translate me</code>';
            window.getComputedStyle = jest.fn().mockReturnValue({
                getPropertyValue: () => 'none'
            });

            // Simulate Edge adding the attribute
            title.setAttribute('_msttexthash', '12345');

            // MutationObserver is asynchronous
            setTimeout(() => {
                try {
                    expect(contentScript.getIsTranslationActive()).toBe(true);
                    expect(document.querySelectorAll('span').length).toBe(1);
                    expect(document.querySelectorAll('code').length).toBe(0);
                    done();
                } catch (error) {
                    done(error);
                }
            }, 100);
        });

        test('should stop processing when _msttexthash is removed from title', (done) => {
            const title = document.querySelector('title');
            contentScript.init();

            // Start translation
            title.setAttribute('_msttexthash', '12345');

            setTimeout(() => {
                expect(contentScript.getIsTranslationActive()).toBe(true);

                // End translation
                title.removeAttribute('_msttexthash');

                setTimeout(() => {
                    try {
                        expect(contentScript.getIsTranslationActive()).toBe(false);
                        done();
                    } catch (error) {
                        done(error);
                    }
                }, 100);
            }, 100);
        });
    });
});
