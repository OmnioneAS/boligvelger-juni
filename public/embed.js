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
 * To embed a single standalone apartment instead of the full widget, add
 * data-unit with that apartment's unit_id:
 *
 *   <div id="bv-embed-SLUG-UNIT"></div>
 *   <script src="https://yourapp.vercel.app/embed.js"
 *           data-project="SLUG"
 *           data-unit="UNIT_ID"
 *           data-target="bv-embed-SLUG-UNIT"
 *           async></script>
 *
 * To embed the Featured Units widget instead, add data-featured="true":
 *
 *   <div id="bv-embed-SLUG-FEATURED"></div>
 *   <script src="https://yourapp.vercel.app/embed.js"
 *           data-project="SLUG"
 *           data-featured="true"
 *           data-target="bv-embed-SLUG-FEATURED"
 *           async></script>
 *
 * Optional data attributes:
 *   data-height   Initial iframe height in px (default: 600)
 *   data-radius   Border radius for the iframe (e.g. "12px")
 *   data-primary  Accent color for buttons, e.g. "#2563eb" (Featured widget only)
 *   data-font     Font-family to use inside the widget, e.g. "Georgia, serif"
 *                 (Featured widget only — the widget lives in a cross-origin
 *                 iframe, so it can't inherit the parent page's font via CSS;
 *                 this passes it through explicitly instead.)
 */
(function () {
  var script = document.currentScript;
  if (!script) return;

  var slug = script.getAttribute('data-project');
  var unitId = script.getAttribute('data-unit');
  var featured = script.getAttribute('data-featured') === 'true';
  var targetId = script.getAttribute('data-target');
  var initialHeight = parseInt(script.getAttribute('data-height') || '600', 10);
  var radius = script.getAttribute('data-radius') || '0px';
  var primary = script.getAttribute('data-primary');
  var font = script.getAttribute('data-font');

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

  var path = featured ? '/featured' : (unitId ? '/' + encodeURIComponent(unitId) : '');
  var query = [];
  if (primary) query.push('primary=' + encodeURIComponent(primary));
  if (font) query.push('font=' + encodeURIComponent(font));

  var iframe = document.createElement('iframe');
  iframe.src = appUrl + '/embed/' + slug + path + (query.length ? '?' + query.join('&') : '');
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
