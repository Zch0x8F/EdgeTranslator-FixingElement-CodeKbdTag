const fs = require('fs');
const path = require('path');

describe('content.js extension', () => {
    let scriptContent;

    beforeAll(() => {
        const scriptPath = path.resolve(__dirname, '../extensions/content.js');
        scriptContent = fs.readFileSync(scriptPath, 'utf8');
    });

    beforeEach(() => {
        document.documentElement.innerHTML = `
            <head>
                <title>Test Page</title>
            </head>
            <body>
                <div id="container">
                    <code>console.log('test')</code>
                    <kbd>Ctrl</kbd>
                    <code id="empty-code"></code>
                    <code id="nested-code"><span>nested</span></code>
                    <p>Some text</p>
                </div>
            </body>
        `;

        window.getComputedStyle = jest.fn().mockImplementation((node) => {
            return {
                getPropertyValue: (prop) => {
                    const styles = {
                        'background-color': 'rgb(255, 0, 0)',
                        'color': 'rgb(255, 255, 255)'
                    };
                    return styles[prop] || '';
                }
            };
        });

        // Run the script
        eval(scriptContent);
    });

    afterEach(() => {
        document.documentElement.innerHTML = '';
        jest.restoreAllMocks();
    });

    it('should replace code and kbd tags without children when translation starts', (done) => {
        const title = document.querySelector('title');
        title.setAttribute('_msttexthash', '12345');

        setTimeout(() => {
            try {
                // The nested code shouldn't be replaced because node.children.length !== 0
                expect(document.querySelector('#nested-code')).not.toBeNull();

                const spans = document.querySelectorAll('span');
                // 3 converted elements + 1 span inside nested code
                expect(spans.length).toBe(4);

                // Original nodes should be removed
                expect(document.querySelectorAll('code').length).toBe(1); // Only nested-code remains
                expect(document.querySelector('kbd')).toBeNull();

                // Validate converted content
                expect(spans[0].innerHTML).toBe("console.log('test')");
                expect(spans[0].style.backgroundColor).toBe("rgb(255, 0, 0)");

                expect(spans[1].innerHTML).toBe("Ctrl");
                expect(spans[1].style.whiteSpace).toBe("nowrap"); // KBD specific styles

                expect(spans[2].innerHTML).toBe(""); // empty-code

                done();
            } catch (error) {
                done(error);
            }
        }, 100);
    });

    it('should process dynamically added nodes while translation is active', (done) => {
        const title = document.querySelector('title');
        title.setAttribute('_msttexthash', '12345');

        setTimeout(() => {
            // After initial translation started, dynamically add a new node
            const container = document.getElementById('container');
            const newCode = document.createElement('code');
            newCode.innerHTML = 'new code';
            container.appendChild(newCode);

            // Wait for childList MutationObserver to process it
            setTimeout(() => {
                try {
                    // It should be converted to span
                    const spans = document.querySelectorAll('span');
                    // 3 initial + 1 nested + 1 new = 5
                    expect(spans.length).toBe(5);
                    expect(spans[4].innerHTML).toBe('new code');

                    done();
                } catch (error) {
                    done(error);
                }
            }, 100);
        }, 100);
    });

    it('should stop tracking when translation ends', (done) => {
        const title = document.querySelector('title');
        title.setAttribute('_msttexthash', '12345');

        setTimeout(() => {
            // End translation
            title.removeAttribute('_msttexthash');

            setTimeout(() => {
                // Dynamically add a node after translation ended
                const container = document.getElementById('container');
                const newCode = document.createElement('code');
                newCode.innerHTML = 'post translation code';
                container.appendChild(newCode);

                setTimeout(() => {
                    try {
                        // The newly added node should NOT be converted to a span
                        const newCodeElement = document.querySelectorAll('code')[1]; // [0] is nested
                        expect(newCodeElement).not.toBeNull();
                        expect(newCodeElement.innerHTML).toBe('post translation code');
                        done();
                    } catch (error) {
                        done(error);
                    }
                }, 100);
            }, 100);
        }, 100);
    });
});
