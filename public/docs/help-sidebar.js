// Help Sidebar Functionality
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('helpSidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const navItems = document.querySelectorAll('.nav-item');
    
    // Load saved sidebar state
    const savedState = localStorage.getItem('helpSidebarCollapsed');
    if (savedState === 'true') {
        sidebar.classList.add('collapsed');
        toggleBtn.querySelector('i').classList.replace('fa-chevron-left', 'fa-chevron-right');
    }
    
    // Toggle sidebar
    toggleBtn.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        const icon = toggleBtn.querySelector('i');
        
        if (isCollapsed) {
            icon.classList.replace('fa-chevron-left', 'fa-chevron-right');
        } else {
            icon.classList.replace('fa-chevron-right', 'fa-chevron-left');
        }
        
        // Save state
        localStorage.setItem('helpSidebarCollapsed', isCollapsed);
    });
    
    // Highlight active page
    const currentPage = window.location.pathname.split('/').pop() || 'help.html';
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href === currentPage) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Mobile menu handling (if needed)
    if (window.innerWidth <= 768) {
        navItems.forEach(item => {
            item.addEventListener('click', function() {
                sidebar.classList.remove('open');
            });
        });
    }
});
