import { doc, setDoc, getDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, getCurrentUserId, appId } from './firebase.js';
import { UIElements, showScreen, resetUI } from './ui.js';

let currentGameId = null;
let unsubscribeGameListener = null;

function generateGameId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function normalizeWord(word) {
    if (!word) return '';
    return word.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function createGame(playerName) {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
        UIElements.homeError.textContent = "Authenticating... Please wait a moment.";
        return;
    }
    if (!playerName) {
        UIElements.homeError.textContent = "Please enter your name first!";
        return;
    }

    UIElements.createGameBtn.disabled = true;
    UIElements.homeError.textContent = '';

    try {
        const newGameId = generateGameId();
        const gameRef = doc(db, `artifacts/${appId}/public/data/games`, newGameId);

        const newGame = {
            status: 'waiting',
            players: { [currentUserId]: { name: playerName, lastWord: null, playerNum: 1, wantsRematch: false } },
            playerIds: [currentUserId],
            round: 1,
            history: [],
        };
        
        await setDoc(gameRef, newGame);
        
        listenToGameUpdates(newGameId);
        
    } catch (error) {
        console.error("Error creating game:", error);
        UIElements.homeError.textContent = "Could not create game. Please try again.";
        UIElements.createGameBtn.disabled = false;
    }
}

export async function joinGame(gameId, playerName) {
    const currentUserId = getCurrentUserId();
    if (!gameId) {
        UIElements.homeError.textContent = "Please enter a Game ID.";
        return;
    }
    if (!currentUserId) {
        UIElements.homeError.textContent = "Authenticating... Please wait a moment.";
        return;
    }
    if (!playerName) {
        UIElements.homeError.textContent = "Please enter your name first!";
        return;
    }
    
    if(UIElements.joinGameBtn) UIElements.joinGameBtn.disabled = true;
    if (UIElements.inviteJoinBtn) UIElements.inviteJoinBtn.disabled = true;


    try {
        const gameRef = doc(db, `artifacts/${appId}/public/data/games`, gameId);
        const gameDoc = await getDoc(gameRef);

        if (!gameDoc.exists()) {
            throw new Error("Game not found. Check the ID and try again.");
        }

        const gameData = gameDoc.data();

        if (gameData.playerIds.length >= 2 && !gameData.playerIds.includes(currentUserId)) {
            throw new Error("This game is already full.");
        }

        if (!gameData.playerIds.includes(currentUserId)) {
             await updateDoc(gameRef, {
                status: 'playing',
                [`players.${currentUserId}`]: { name: playerName, lastWord: null, playerNum: 2, wantsRematch: false },
                playerIds: [...gameData.playerIds, currentUserId]
            });
        }
       
        listenToGameUpdates(gameId);
    } catch (error) {
        console.error("Error joining game:", error);
        UIElements.homeError.textContent = error.message;
        if(UIElements.joinGameBtn) UIElements.joinGameBtn.disabled = false;
        if (UIElements.inviteJoinBtn) UIElements.inviteJoinBtn.disabled = false;
    }
}

export async function submitWord() {
    const word = UIElements.wordInput.value.trim();
    const currentUserId = getCurrentUserId();
    if (!word || !currentGameId) return;

    UIElements.submitWordBtn.disabled = true;
    UIElements.wordInput.disabled = true;

    try {
        const gameRef = doc(db, `artifacts/${appId}/public/data/games`, currentGameId);
        await updateDoc(gameRef, { [`players.${currentUserId}.lastWord`]: word });
    } catch (error) {
        console.error("Error submitting word:", error);
        UIElements.inputFeedback.textContent = "Couldn't submit word. Try again.";
        UIElements.submitWordBtn.disabled = false;
        UIElements.wordInput.disabled = false;
    }
}

function processRound(gameData) {
    const gameRef = doc(db, `artifacts/${appId}/public/data/games`, currentGameId);
    
    const [p1Id, p2Id] = gameData.playerIds;
    const player1 = gameData.players[p1Id];
    const player2 = gameData.players[p2Id];
    const match = normalizeWord(player1.lastWord) === normalizeWord(player2.lastWord);

    const newHistoryEntry = { round: gameData.round, word1: player1.lastWord, word2: player2.lastWord, match };
    const history = [...gameData.history, newHistoryEntry];

    if (match) {
        updateDoc(gameRef, { status: 'gameover', history });
    } else {
        updateDoc(gameRef, {
            round: gameData.round + 1,
            [`players.${p1Id}.lastWord`]: null,
            [`players.${p2Id}.lastWord`]: null,
            history
        });
    }
}

async function startNewGameFromRematch(oldGameData) {
    const newGameId = generateGameId();
    const newGameRef = doc(db, `artifacts/${appId}/public/data/games`, newGameId);
    
    const newPlayers = {};
    oldGameData.playerIds.forEach(id => {
        newPlayers[id] = { ...oldGameData.players[id], lastWord: null, wantsRematch: false };
    });

    const newGame = {
        status: 'playing',
        players: newPlayers,
        playerIds: oldGameData.playerIds,
        round: 1,
        history: [],
    };

    await setDoc(newGameRef, newGame);
    
    const oldGameRef = doc(db, `artifacts/${appId}/public/data/games`, currentGameId);
    await updateDoc(oldGameRef, { nextGameId: newGameId });
}

export async function requestRematch() {
    const currentUserId = getCurrentUserId();
    if (!currentGameId || !currentUserId) return;

    UIElements.playAgainBtn.disabled = true;
    UIElements.playAgainBtn.textContent = 'Waiting for opponent...';

    const gameRef = doc(db, `artifacts/${appId}/public/data/games`, currentGameId);
    await updateDoc(gameRef, {
        [`players.${currentUserId}.wantsRematch`]: true
    });
}

function listenToGameUpdates(gameId) {
    currentGameId = gameId;
    if (unsubscribeGameListener) unsubscribeGameListener();
    
    const gameRef = doc(db, `artifacts/${appId}/public/data/games`, gameId);
    unsubscribeGameListener = onSnapshot(gameRef, (doc) => {
        if (!doc.exists()) {
            alert("The game was deleted.");
            resetGame();
            return;
        }

        const gameData = doc.data();

        if (gameData.nextGameId) {
            listenToGameUpdates(gameData.nextGameId);
            return; 
        }

        updateUIWithGameState(gameData);
        
        const [p1, p2] = gameData.playerIds.map(id => gameData.players[id] || {});

        if (gameData.status === 'playing' && p1.lastWord && p2.lastWord) {
             const match = normalizeWord(p1.lastWord) === normalizeWord(p2.lastWord);
             setTimeout(() => processRound(gameData), match ? 0 : 1000);
        } else if (gameData.status === 'gameover') {
            if (p1.wantsRematch && p2.wantsRematch && getCurrentUserId() === gameData.playerIds[0]) {
                startNewGameFromRematch(gameData);
            }
        }
    });
}

export function resetGame() {
    if (unsubscribeGameListener) {
        unsubscribeGameListener();
    }
    currentGameId = null;
    unsubscribeGameListener = null;
    resetUI();
    showScreen('home-screen');
}

function updateUIWithGameState(gameData) {
     const currentUserId = getCurrentUserId();
     if (!currentUserId || !gameData.playerIds.includes(currentUserId)) return;

     if (gameData.status === 'waiting') {
        showScreen('lobby');
        UIElements.gameIdDisplay.textContent = currentGameId;
        UIElements.lobbyStatus.classList.add('waiting-text-animation');
        UIElements.lobbyStatus.textContent = "Waiting for Player 2 to join...";
     } else if (gameData.status === 'playing') {
        showScreen('game-board');
        
        const me = gameData.players[currentUserId];
        const opponentId = gameData.playerIds.find(id => id !== currentUserId);
        const opponent = opponentId ? gameData.players[opponentId] : null;

        if (!opponent) return;

        const iHaveSubmitted = me.lastWord !== null;
        const opponentHasSubmitted = opponent.lastWord !== null;
        const bothSubmitted = iHaveSubmitted && opponentHasSubmitted;
        
        UIElements.roundDisplay.textContent = gameData.round;
        UIElements.player1NameDisplay.textContent = gameData.players[gameData.playerIds[0]].name;
        UIElements.player2NameDisplay.textContent = gameData.players[gameData.playerIds[1]].name;
        
        const myWordBubble = me.playerNum === 1 ? UIElements.word1Display : UIElements.word2Display;
        myWordBubble.textContent = iHaveSubmitted ? me.lastWord : '???';

        const opponentWordBubble = me.playerNum === 1 ? UIElements.word2Display : UIElements.word1Display;
        opponentWordBubble.textContent = opponentHasSubmitted ? 'Ready' : '???';
        
        UIElements.wordInput.disabled = iHaveSubmitted;
        UIElements.submitWordBtn.disabled = iHaveSubmitted;
        UIElements.submitWordBtn.textContent = iHaveSubmitted ? 'Submitted' : 'Submit';
        UIElements.inputFeedback.textContent = iHaveSubmitted ? 'Waiting for opponent...' : 'Enter your word for this round.';
        
        if (!iHaveSubmitted && !opponentHasSubmitted) {
            UIElements.wordInput.value = '';
        }

        UIElements.boardStatus.classList.remove('font-bold', 'text-teal-500', 'text-red-500', 'waiting-text-animation');
        UIElements.boardStatus.classList.add('font-medium', 'text-gray-500');

        if (bothSubmitted) {
            UIElements.word1Display.textContent = gameData.players[gameData.playerIds[0]].lastWord;
            UIElements.word2Display.textContent = gameData.players[gameData.playerIds[1]].lastWord;
            const match = normalizeWord(UIElements.word1Display.textContent) === normalizeWord(UIElements.word2Display.textContent);

            if (match) {
                UIElements.boardStatus.textContent = "Meld!";
                UIElements.boardStatus.classList.remove('font-medium', 'text-gray-500');
                UIElements.boardStatus.classList.add('font-bold', 'text-teal-500');
            } else {
                UIElements.boardStatus.textContent = "Not a match! Try again.";
                UIElements.word1Display.classList.add('shake');
                UIElements.word2Display.classList.add('shake');
                
                setTimeout(() => {
                    UIElements.word1Display.classList.remove('shake');
                    UIElements.word2Display.classList.remove('shake');
                }, 800);
            }
        } else if (opponentHasSubmitted) {
            UIElements.boardStatus.textContent = `${opponent.name} is ready!`;
        } else {
             UIElements.boardStatus.textContent = iHaveSubmitted ? `Waiting for ${opponent.name}...` : 'Players are thinking...';
             UIElements.boardStatus.classList.add('waiting-text-animation');
        }

     } else if (gameData.status === 'gameover') {
         showScreen('game-over-screen');
         const player1Name = gameData.players[gameData.playerIds[0]].name;
         const player2Name = gameData.players[gameData.playerIds[1]].name;
         UIElements.winnerNames.textContent = `${player1Name} & ${player2Name}`;
         UIElements.gameOverMessage.textContent = `You both guessed '${gameData.history.slice(-1)[0].word1}'!`;
         
         const me = gameData.players[currentUserId];
         if (me.wantsRematch) {
            UIElements.playAgainBtn.disabled = true;
            UIElements.playAgainBtn.textContent = 'Waiting for opponent...';
         } else {
            UIElements.playAgainBtn.disabled = false;
            UIElements.playAgainBtn.textContent = 'Play Again';
         }
     }

     UIElements.wordHistory.innerHTML = '';
     gameData.history?.slice().reverse().forEach(entry => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center text-sm p-2 bg-gray-100 rounded-md';
        div.innerHTML = `<span class="font-semibold text-indigo-700">${entry.round}</span>
                         <span class="text-gray-600">${entry.word1} | ${entry.word2}</span>
                         <span class="font-bold ${entry.match ? 'text-teal-500' : 'text-red-500'}">${entry.match ? 'Meld!' : 'No Match'}</span>`;
        UIElements.wordHistory.appendChild(div);
     });
}

