import { initializeFirebase, authenticateUser } from './firebase.js';
import { createGame, joinGame, submitWord, requestRematch, resetGame } from './game.js';
import { UIElements, showScreen, initUI } from './ui.js';

let gameIdFromUrl = null;

function setupEventListeners() {
    UIElements.createGameBtn.addEventListener('click', () => {
        const playerName = UIElements.playerNameInput.value.trim();
        if (!playerName) {
            UIElements.homeError.textContent = "Please enter your name first!";
            return;
        }
        createGame(playerName);
    });
    
    UIElements.joinGameBtn.addEventListener('click', () => {
        const gameId = UIElements.joinGameIdInput.value.trim().toUpperCase();
        const playerName = UIElements.playerNameInput.value.trim();

        if (!gameId) {
            UIElements.homeError.textContent = "Please enter a Game ID.";
            return;
        }

        // If the player has entered a name, join directly.
        if (playerName) {
            joinGame(gameId, playerName);
        } else {
            // If no name, take them to the invite screen to enter one.
            gameIdFromUrl = gameId;
            showScreen('invite-screen');
            UIElements.inviteGameCode.textContent = gameId;
            UIElements.inviterNameDisplay.textContent = "Enter your name to join the game!";
            UIElements.inviteNameInput.focus();
        }
    });

    UIElements.inviteJoinBtn.addEventListener('click', () => {
        if (gameIdFromUrl) {
            const playerName = UIElements.inviteNameInput.value.trim();
            if (!playerName) {
                UIElements.inviteError.textContent = "Please enter your name to join!";
                return;
            }
            joinGame(gameIdFromUrl, playerName);
        }
    });

    UIElements.submitWordBtn.addEventListener('click', submitWord);
    UIElements.playAgainBtn.addEventListener('click', requestRematch);

    UIElements.gameIdContainer.addEventListener('click', () => {
        const gameId = UIElements.gameIdDisplay.textContent;
        if (!gameId) return;
        
        navigator.clipboard.writeText(gameId).then(() => {
            UIElements.gameIdContainer.classList.add('copied');
            setTimeout(() => {
                UIElements.gameIdContainer.classList.remove('copied');
            }, 500);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    });

    UIElements.shareGameBtn.addEventListener('click', () => {
        const gameId = UIElements.gameIdDisplay.textContent;
        const creatorName = UIElements.playerNameInput.value.trim();
        if (!gameId) return;

        let inviteLink = `${window.location.origin}${window.location.pathname}?game=${gameId}`;
        if (creatorName) {
            inviteLink += `&invitedBy=${encodeURIComponent(creatorName)}`;
        }

        const shareData = {
            title: 'MindMeld Game Invite',
            text: `${creatorName || 'A friend'} has invited you to play MindMeld!`,
            url: inviteLink,
        };

        if (navigator.share) {
            navigator.share(shareData).catch((err) => console.error('Error sharing:', err));
        } else {
            navigator.clipboard.writeText(inviteLink).then(() => {
                UIElements.gameIdContainer.classList.add('copied');
                setTimeout(() => {
                    UIElements.gameIdContainer.classList.remove('copied');
                }, 500);
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        }
    });
    
    UIElements.wordInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            UIElements.submitWordBtn.click();
        }
    });

    UIElements.howToPlayBtn.addEventListener('click', () => {
        UIElements.rulesModal.classList.remove('hidden');
    });

    UIElements.closeModalBtn.addEventListener('click', () => {
        UIElements.rulesModal.classList.add('hidden');
    });

    UIElements.rulesModal.addEventListener('click', (event) => {
        if (event.target === UIElements.rulesModal) {
            UIElements.rulesModal.classList.add('hidden');
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
    } else {
        showScreen('home-screen');
    }
}

function init() {
    initUI();
    handleUrlGameInvite();
    initializeFirebase();
    authenticateUser();
    setupEventListeners();
}

init();

