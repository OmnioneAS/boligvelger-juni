/**
 * Boligvelger embed script.
 * Customers paste this into their WordPress site (Custom HTML block):
 *
 *   <div id="bv-embed-SLUG"></div>
 *   <script src="https://yourapp.vercel.app/embed.js"
 *           data-project="SLUG"
 *           data-target="bv-embed-SLUG"
 *           async></script>
 *
 * Optional data attributes:
 *   data-height   Initial iframe height in px (default: 600)
 *   data-radius   Border radius for the iframe (e.g. "12px")
 */
(function () {
  var script = document.currentScript;
  if (!script) return;

  var slug = script.getAttribute('data-project');
  var targetId = script.getAttribute('data-target');
  var initialHeight = parseInt(script.getAttribute('data-height') || '600', 10);
  var radius = script.getAttribute('data-radius') || '0px';

  if (!slug || !targetId) {
    console.warn('[boligvelger] Missing data-project or data-target attribute.');
    return;
  }

  var container = document.getElementById(targetId);
  if (!container) {
    console.warn('[boligvelger] Target element #' + targetId + ' not found.');
    return;
  }

  // Derive app URL from the script src
  var scriptSrc = script.getAttribute('src') || '';
  var appUrl = scriptSrc.replace(/\/embed\.js.*$/, '') || 'https://localhost:3000';

  var iframe = document.createElement('iframe');
  iframe.src = appUrl + '/embed/' + slug;
  iframe.style.cssText = [
    'width:100%',
    'height:' + initialHeight + 'px',
    'border:none',
    'border-radius:' + radius,
    'display:block',
  ].join(';');
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('allow', 'autoplay');
  iframe.setAttribute('title', 'Boligvelger');

  container.appendChild(iframe);

  // Listen for resize + analytics events from the widget
  window.addEventListener('message', function (e) {
    if (!e.data || typeof e.data !== 'object') return;

    // Height resize from WidgetClient
    if (e.data.type === 'bv:resize' && e.data.slug === slug) {
      iframe.style.height = e.data.height + 'px';
    }

    // Forward analytics events to parent-page GA4 / Meta Pixel
    if (e.data.type === 'bv:analytics') {
      if (typeof window.gtag === 'function') {
        window.gtag('event', e.data.event, e.data.params || {});
      }
      if (typeof window.fbq === 'function') {
        window.fbq('trackCustom', e.data.event, e.data.params || {});
      }
    }
  });
})();
