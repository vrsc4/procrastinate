// Add hover effect to book cards
document.querySelectorAll('.book-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
    });
});

// Add click event to book cards to show more information
document.querySelectorAll('.book-card').forEach(card => {
    card.addEventListener('click', () => {
        const title = card.querySelector('h3').textContent;
        alert(`${title} is a great book about productivity and habit formation. Check it out at your local bookstore or online!`);
    });
});
