const { spawn } = require('child_process');

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cp = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9230',
    '--user-data-dir=C:\\Users\\wuttichai\\AppData\\Local\\Temp\\chrome_gas_inspect_' + Date.now(),
    'https://script.google.com/macros/s/AKfycbwnP-RK798xf8HsPJESYIwlTEnx0-edSgViZ43uOMczdcbWC7Rv7t_MgLT2H5WYlidn/exec'
  ]);

  try {
    let iframeTarget = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 600));
      try {
        const listRes = await fetch('http://127.0.0.1:9230/json/list');
        const targets = await listRes.json();
        iframeTarget = targets.find(t => t.type === 'iframe' && t.url.includes('googleusercontent.com'));
        if (iframeTarget) {
          console.log('Found iframe target:', iframeTarget.url);
          break;
        }
      } catch (e) {}
    }

    if (!iframeTarget) {
      console.error('Could not find iframe target in time');
      cp.kill();
      process.exit(1);
    }

    const ws = new WebSocket(iframeTarget.webSocketDebuggerUrl);
    let msgId = 1;
    function send(method, params = {}) {
      ws.send(JSON.stringify({ id: msgId++, method, params }));
    }

    const contexts = [];

    ws.onopen = () => {
      console.log('Connected to iframe wsDebugger');
      send('Runtime.enable');
      send('Log.enable');
      send('Console.enable');

      setTimeout(() => {
        console.log('Testing evaluations across contexts:', contexts.map(c => ({ id: c.id, name: c.name })));
        for (const ctx of contexts) {
          send('Runtime.evaluate', {
            contextId: ctx.id,
            expression: `
              (function() {
                const mapEl = document.getElementById('map');
                const pinAllEl = document.getElementById('pinCount-ALL');
                const tabMap = document.getElementById('tabContent-map');
                const tabAnalytics = document.getElementById('tabContent-analytics');
                return {
                  contextId: ${ctx.id},
                  hasMap: !!mapEl,
                  mapChildren: mapEl ? mapEl.children.length : -1,
                  pinAllText: pinAllEl ? pinAllEl.textContent : 'none',
                  typeofSwitchTab: typeof window.switchTab,
                  typeofInitMap: typeof window.initMap,
                  allItemsCount: typeof allItems !== 'undefined' ? allItems.length : 'no allItems'
                };
              })()
            `,
            returnByValue: true
          });
        }

        // Test tab switching in context where switchTab exists
        setTimeout(() => {
          for (const ctx of contexts) {
            send('Runtime.evaluate', {
              contextId: ctx.id,
              expression: `
                (function() {
                  if (typeof window.switchTab === 'function') {
                    // Test 1: Water tab and official sources
                    window.switchTab('water');
                    const waterHidden = document.getElementById('tabContent-water').classList.contains('hidden');
                    const sourcesCount = document.getElementById('officialSourcesList') ? document.getElementById('officialSourcesList').children.length : -1;

                    // Test 2: Routes tab and map
                    window.switchTab('routes');
                    const routesHidden = document.getElementById('tabContent-routes').classList.contains('hidden');
                    const routesMapChildren = document.getElementById('routesMap') ? document.getElementById('routesMap').children.length : -1;
                    const routesCardsCount = document.getElementById('routesListContainer') ? document.getElementById('routesListContainer').children.length : -1;
                    const kpiCrit = document.getElementById('routesKpiCritical') ? document.getElementById('routesKpiCritical').textContent : 'none';

                    // Switch back to map
                    window.switchTab('map');

                    return {
                      testedContext: ${ctx.id},
                      switchSuccess: true,
                      waterHidden: waterHidden,
                      officialSourcesCount: sourcesCount,
                      routesHidden: routesHidden,
                      routesMapChildren: routesMapChildren,
                      routesCardsCount: routesCardsCount,
                      routesKpiCritical: kpiCrit
                    };
                  }
                  return { testedContext: ${ctx.id}, switchSuccess: false };
                })()
              `,
              returnByValue: true
            });
          }
        }, 2000);

      }, 4000);
    };

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.method === 'Runtime.executionContextCreated') {
        contexts.push(msg.params.context);
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        console.log('>>> [CONSOLE.' + msg.params.type.toUpperCase() + ']', msg.params.args.map(a => a.value || a.description).join(' '));
      } else if (msg.method === 'Runtime.exceptionThrown') {
        console.error('>>> [RUNTIME EXCEPTION]:', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception ? (msg.params.exceptionDetails.exception.description || msg.params.exceptionDetails.exception.value) : '');
      } else if (msg.result && msg.result.result && msg.result.result.value) {
        console.log('>>> EVAL RESULT:', JSON.stringify(msg.result.result.value, null, 2));
      }
    };

    setTimeout(() => {
      ws.close();
      cp.kill();
      process.exit(0);
    }, 10000);

  } catch (err) {
    console.error('Fatal error:', err);
    cp.kill();
    process.exit(1);
  }
}

main();
