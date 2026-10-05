const { spawn } = require('child_process');

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=C:\\Users\\wuttichai\\AppData\\Local\\Temp\\chrome_gas_iframe_debug2',
    '--no-first-run',
    '--no-default-browser-check',
    'https://script.google.com/macros/s/AKfycbwnP-RK798xf8HsPJESYIwlTEnx0-edSgViZ43uOMczdcbWC7Rv7t_MgLT2H5WYlidn/exec'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        const data = await res.json();
        wsUrl = data.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  const ws = new WebSocket(wsUrl);
  let id = 1;

  function send(method, params = {}) {
    const curId = id++;
    ws.send(JSON.stringify({ id: curId, method, params }));
    return curId;
  }

  ws.onopen = () => {
    console.log('WS connected to browser. Setting autoAttach...');
    send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
  };

  ws.onmessage = (evt) => {
    const msg = JSON.parse(evt.data);

    if (msg.method === 'Target.attachedToTarget') {
      const sessionId = msg.params.sessionId;
      const targetInfo = msg.params.targetInfo;
      console.log('>>> ATTACHED TO TARGET:', targetInfo.type, targetInfo.url);
      
      ws.send(JSON.stringify({ id: id++, sessionId, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: id++, sessionId, method: 'Log.enable' }));
      ws.send(JSON.stringify({ id: id++, sessionId, method: 'Console.enable' }));

      if (targetInfo.url && targetInfo.url.includes('googleusercontent.com')) {
        console.log('FOUND USER CODE APP PANEL! Setting up evaluators...');
        setTimeout(() => {
          ws.send(JSON.stringify({
            id: id++,
            sessionId,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                (function() {
                  return {
                    title: document.title,
                    readyState: document.readyState,
                    hasMapEl: !!document.getElementById('map'),
                    mapChildren: document.getElementById('map') ? document.getElementById('map').children.length : 0,
                    pinAll: document.getElementById('pinCount-ALL') ? document.getElementById('pinCount-ALL').textContent : 'no el',
                    switchTabType: typeof window.switchTab,
                    allItemsLen: typeof allItems !== 'undefined' ? allItems.length : 'no allItems',
                    filteredItemsLen: typeof filteredItems !== 'undefined' ? filteredItems.length : 'no filteredItems'
                  };
                })()
              `,
              returnByValue: true
            }
          }));
        }, 4000);
      }
    }

    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('>>> [CONSOLE.' + msg.params.type.toUpperCase() + ']', msg.params.args.map(a => a.value || a.description).join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('>>> [RUNTIME EXCEPTION]:', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception ? (msg.params.exceptionDetails.exception.description || msg.params.exceptionDetails.exception.value) : '');
    }
    if (msg.method === 'Log.entryAdded') {
      console.log('>>> [LOG ENTRY]:', msg.params.entry.level, msg.params.entry.text);
    }
    if (msg.result && msg.result.result && msg.result.result.value) {
      console.log('>>> EVAL RESULT:', JSON.stringify(msg.result.result.value, null, 2));
    }
  };

  setTimeout(() => {
    ws.close();
    chromeProc.kill();
    process.exit(0);
  }, 12000);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
