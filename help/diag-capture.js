// YALLA KIDS: remembers the last 20 technical error messages of this tab, for the help center's check-up.
// Include with <script src="help/diag-capture.js"></script>. Message text only: no addresses, no stack, nothing about the child.
(function () {
  var KEY = 'yk_errors', MAX = 20;
  function keep(msg) {
    try {
      var text = String(msg || 'error').replace(/(?:https?|wss?|blob|file):\S+/g, '[url]').replace(/\s+/g, ' ').trim().slice(0, 160);
      var list = JSON.parse(sessionStorage.getItem(KEY) || '[]');
      if (!Array.isArray(list)) list = [];
      list.push(text);
      sessionStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
    } catch (e) { /* storage is full or blocked: nothing to do */ }
  }
  addEventListener('error', function (e) { keep(e && e.message); });
  addEventListener('unhandledrejection', function (e) { var r = e && e.reason; keep((r && r.message) || r); });
})();
