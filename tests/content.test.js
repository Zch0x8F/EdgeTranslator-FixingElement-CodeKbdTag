const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const contentJsPath = path.resolve(__dirname, '../extensions/content.js');
const contentJsCode = fs.readFileSync(contentJsPath, 'utf8');

describe('content.js replaceTagToSpan', () => {
    let dom;

    beforeEach(() => {
        // Create a JSDOM environment
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head><title>Test</title></head>
            <body></body>
            </html>
        `, { runScripts: "dangerously" });

        // Mock getComputedStyle for the tests
        dom.window.getComputedStyle = () => ({
            getPropertyValue: (prop) => {
                const styles = {
                    'background-color': 'red',
                    'border-radius': '5px',
                    'border': '1px solid black',
                    'box-shadow': 'none',
                    'color': 'white',
                    'display': 'inline',
                    'font-size': '12px',
                    'font-family': 'monospace',
                    'font-weight': 'bold',
                    'line-height': '1.5',
                    'padding': '2px',
                    'margin': '1px',
                    'white-space': 'pre'
                };
                return styles[prop] || '';
            }
        });
    });

    it('should replace <code> tag without children', async () => {
        const { window } = dom;
        const { document } = window;

        // Add <code> without children
        document.body.innerHTML = '<code>print("hello")</code>';

        // Evaluate the script
        window.eval(contentJsCode);

        // Trigger translation active
        const title = document.querySelector('title');
        title.setAttribute('_msttexthash', '12345');

        // Wait a bit for MutationObserver to process
        await new Promise(resolve => setTimeout(resolve, 50));

        // <code> should be replaced by <span>
        const span = document.querySelector('span');
        expect(span).not.toBeNull();
        expect(document.querySelector('code')).toBeNull();
        expect(span.innerHTML).toBe('print("hello")');
        expect(span.style.color).toBe('white');
    });

    it('should not replace <code> tag with children', async () => {
        const { window } = dom;
        const { document } = window;

        // Add <code> with children
        document.body.innerHTML = '<code><span>print("hello")</span></code>';

        // Evaluate the script
        window.eval(contentJsCode);

        // Trigger translation active
        const title = document.querySelector('title');
        title.setAttribute('_msttexthash', '12345');

        // Wait a bit for MutationObserver to process
        await new Promise(resolve => setTimeout(resolve, 50));

        // <code> should NOT be replaced
        const code = document.querySelector('code');
        expect(code).not.toBeNull();
        expect(document.querySelector('body > span')).toBeNull();
        expect(code.innerHTML).toBe('<span>print("hello")</span>');
    });
});
