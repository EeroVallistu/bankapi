// Simple script to redirect from index page to Swagger docs
document.addEventListener('DOMContentLoaded', function() {
    const docsButton = document.getElementById('docs-button');
    if (docsButton) {
        docsButton.addEventListener('click', function() {
            window.location.href = '/docs';
        });
    }
});
