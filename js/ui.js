let UIElements = {};

export function initUI() {
    UIElements = {
        homeScreen: document.getElementById('home-screen'),
        gameScreen: document.getElementById('game-screen'),
        inviteScreen: document.getElementById('invite-screen'),
        lobby: document.getElementById('lobby'),
        gameBoard: document.getElementById('game-board'),
        gameOverScreen: document.getElementById('game-over-screen'),
        wordHistoryContainer: document.getElementById('word-history-container'),

        playerNameInput: document.getElementById('player-name-input'),
        createGameBtn: document.getElementById('create-game-btn'),
        joinGameIdInput: document.getElementById('join-game-id-input'),
        joinGameBtn: document.getElementById('join-game-btn'),
        homeError: document.getElementById('home-error'),

        inviteNameInput: document.getElementById('invite-name-input'),
        inviteGameCode: document.getElementById('invite-game-code'),
        inviteJoinBtn: document.getElementById('invite-join-btn'),
        inviterNameDisplay: document.getElementById('inviter-name-display'),

        gameIdDisplay: document.getElementById('game-id-display'),
        gameIdContainer: document.getElementById('game-id-container'),

        lobbyStatus: document.getElementById('lobby-status'),
        boardStatus: document.getElementById('board-status'),
        roundDisplay: document.getElementById('round-display'),
        player1NameDisplay: document.getElementById('player1-name-display'),
        player2NameDisplay: document.getElementById('player2-name-display'),
        word1Display: document.getElementById('word1-display'),
        word2Display: document.getElementById('word2-display'),

        wordInput: document.getElementById('word-input'),
        submitWordBtn: document.getElementById('submit-word-btn'),
        inputFeedback: document.getElementById('input-feedback'),

        wordHistory: document.getElementById('word-history'),
        gameOverTitle: document.getElementById('game-over-title'),
        gameOverMessage: document.getElementById('game-over-message'),
        winnerNames: document.getElementById('winner-names'),
        playAgainBtn: document.getElementById('play-again-btn'),
    };
}

export { UIElements };

export function showScreen(screenId) {
    const screens = ['home-screen', 'game-screen', 'invite-screen', 'lobby', 'game-board', 'game-over-screen'];
    screens.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    const screenToShow = document.getElementById(screenId);
    if (screenToShow) screenToShow.classList.remove('hidden');

    if (['lobby', 'game-board', 'game-over-screen'].includes(screenId)) {
        UIElements.gameScreen.classList.remove('hidden');
    }
    
    if (['game-board', 'game-over-screen'].includes(screenId)) {
        UIElements.wordHistoryContainer.classList.remove('hidden');
    } else {
        UIElements.wordHistoryContainer.classList.add('hidden');
    }
}

export function resetUI() {
    if (UIElements.homeError) UIElements.homeError.textContent = "";
    if (UIElements.joinGameIdInput) UIElements.joinGameIdInput.value = '';
    if (UIElements.createGameBtn) UIElements.createGameBtn.disabled = false;
    if (UIElements.joinGameBtn) UIElements.joinGameBtn.disabled = false;
    if (UIElements.wordInput) UIElements.wordInput.value = '';
}
