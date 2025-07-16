// Hash Navigation for Collapsible Content
// This script handles automatic opening of collapsible content when navigating to hash URLs

// Handle hash navigation on page load
function handleHashNavigation() {
    const hash = window.location.hash;
    if (hash) {
        // Handle IDs that start with numbers (like #1984)
        const targetId = hash.substring(1); // Remove the # symbol
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            // Check if the target is a collapsible content
            if (targetElement.classList.contains('collapsiblecontent')) {
                // Find the corresponding collapsible button
                const collapsibleButton = targetElement.previousElementSibling;
                if (collapsibleButton && collapsibleButton.classList.contains('collapsible')) {
                    // Open the collapsible content
                    collapsibleButton.classList.add('open', 'active');
                    targetElement.style.maxHeight = targetElement.scrollHeight + 'px';
                }
            }
            
            // Wait a bit for the content to expand, then scroll
            setTimeout(() => {
                // Calculate position: element's top position - 50px offset
                const targetPosition = targetElement.offsetTop - 50;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }, 100);
        }
    }
}

// Initialize hash navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Handle hash navigation when page loads
    handleHashNavigation();
    
    // Also handle hash changes (in case someone changes the hash after page load)
    window.addEventListener('hashchange', handleHashNavigation);
}); 