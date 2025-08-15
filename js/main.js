import { initializeFirebase, authenticateUser } from './firebase.js';
// Correctly import requestRematch and remove the unused resetGame import from here
import { createGame, joinGame, submitWord, requestRematch } from './game.js';
import { UIElements, showScreen, initUI } from './ui.js';

let gameIdFromUrl = null;

function setupEventListeners() {
    UIElements.createGameBtn.addEventListener('click', createGame);
    
    UIElements.joinGameBtn.addEventListener('click', () => {
        const gameId = UIElements.joinGameIdInput.value.trim().toUpperCase();
        if (!gameId) {
            UIElements.homeError.textContent = "Please enter a Game ID.";
            return;
        }
        if (!UIElements.playerNameInput.value.trim()) {
            gameIdFromUrl = gameId;
            showScreen('invite-screen');
            UIElements.inviteGameCode.textContent = gameId;
            UIElements.inviterNameDisplay.textContent = "You've been invited to play MindMeld!";
            UIElements.inviteNameInput.focus();
        } else {
            joinGame(gameId, UIElements.playerNameInput.value);
        }
    });

    UIElements.inviteJoinBtn.addEventListener('click', () => {
        if (gameIdFromUrl) {
            const playerName = UIElements.inviteNameInput.value;
            joinGame(gameIdFromUrl, playerName);
        }
    });

    UIElements.submitWordBtn.addEventListener('click', submitWord);
    
    // --- THIS IS THE FIX ---
    // The Play Again button now correctly calls requestRematch
    UIElements.playAgainBtn.addEventListener('click', requestRematch);

    UIElements.gameIdContainer.addEventListener('click', () => {
        const gameId = UIElements.gameIdDisplay.textContent;
        if (!gameId) return;
        
        const creatorName = UIElements.playerNameInput.value.trim();
        let inviteLink = `${window.location.origin}${window.location.pathname}?game=${gameId}`;
        
        if (creatorName) {
            inviteLink += `&invitedBy=${encodeURIComponent(creatorName)}`;
        }
        
        navigator.clipboard.writeText(inviteLink).then(() => {
            UIElements.gameIdContainer.classList.add('copied');
            setTimeout(() => {
                UIElements.gameIdContainer.classList.remove('copied');
            }, 500);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    });
    
    UIElements.wordInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            UIElements.submitWordBtn.click();
        }
    });
}

function handleUrlGameInvite() {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('game');
    const inviterName = params.get('invitedBy');

    if (gameId && gameId.length === 6) {
        gameIdFromUrl = gameId.toUpperCase();
        showScreen('invite-screen');
        UIElements.inviteGameCode.textContent = gameIdFromUrl;

        if (inviterName) {
            UIElements.inviterNameDisplay.textContent = `${decodeURIComponent(inviterName)} has invited you to play!`;
        } else {
            UIElements.inviterNameDisplay.textContent = "You've been invited to play MindMeld!";
        }
        
        UIElements.inviteNameInput.focus();
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

function init() {
    initUI();
    initializeFirebase();
    authenticateUser().then(() => {
        handleUrlGameInvite();
    });
    setupEventListeners();
}

window.addEventListener('load', init);
