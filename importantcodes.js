// Import required libraries
const TelegramBot = require("node-telegram-bot-api");
const path = require("path"); // Required to resolve the file path
const db = require("./db"); // Import your database connection

// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with your actual bot token
const token = "7236960406:AAEtk6DgtqZFUqyC2qVycewUYZbD6u7e_nU"; // Replace this with your token
const bot = new TelegramBot(token, { polling: true });

console.log("Shanet Bingo bot is up and running!");

// User state tracking
const userStates = {};

// /start command to welcome the user with an image, text, and inline buttons
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeImagePath = path.resolve(__dirname, "images/welcome.jpg");

  bot.sendPhoto(chatId, welcomeImagePath, {
    caption:
      "🎉 Welcome to Shanet Bingo! 🎉\nGet ready to experience the thrill of Bingo. Select an option below to get started!",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Play 🎲", callback_data: "play" },
          { text: "Register 📝", callback_data: "register" },
        ],
        [
          { text: "Check Balance 💰", callback_data: "check_balance" },
          { text: "Deposit 🏦", callback_data: "deposit" },
        ],
        [
          { text: "Support 📞", callback_data: "support" },
          { text: "Instructions 📖", callback_data: "instructions" },
        ],
        [{ text: "Invite 🔗", callback_data: "invite" }],
      ],
    },
  });
});

// /register command handling
bot.onText(/\/register/, (msg) => {
  const chatId = msg.chat.id;

  // Check if user is already registered based on chatId
  db.query(
    "SELECT * FROM users WHERE telegram_id = ?",
    [chatId],
    (error, results) => {
      if (error) {
        console.error("Database query error:", error);
        bot.sendMessage(chatId, "There was an error processing your request. Please try again.");
        return;
      }

      if (results.length > 0) {
        // User already registered
        bot.sendMessage(chatId, "You're already registered, but you can /play.");
      } else {
        // User not registered, proceed with asking for phone number
        bot.sendMessage(chatId, "Please enter your phone number:");
        
        // Set user state to track registration progress
        userStates[chatId] = { step: "awaiting_registration_phone" };
      }
    }
  );
});

// Handle callback queries (including the "Register" button)
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;

  switch (query.data) {
    case "register":
      // Registration process (similar to /register command)
      bot.sendMessage(chatId, "Please enter your phone number:");
      userStates[chatId] = { step: "awaiting_registration_phone" };
      break;

    case "deposit":
      bot.sendMessage(
        chatId,
        "Please visit our deposit page to add funds to your account."
      );
      break;

    case "play":
      bot.sendMessage(
        chatId,
        "🍀 Good luck! Choose your play amount and enjoy the game! 🍀",
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Play 10 🎮", callback_data: "play_10" },
                { text: "Play 20 🎮", callback_data: "play_20" },
              ],
              [
                { text: "Play 50 🎮", callback_data: "play_50" },
                { text: "Play 100 🎮", callback_data: "play_100" },
              ],
              [{ text: "Play Demo 🎲", callback_data: "play_0" }],
            ],
          },
        }
      );
      break;

    case "check_balance":
      // Check the user's balance and respond with the result
      db.query(
        "SELECT balance FROM users WHERE telegram_id = ?",
        [chatId],
        (error, results) => {
          if (error) {
            console.error("Error fetching balance:", error);
            bot.sendMessage(chatId, "There was an error checking your balance. Please try again.");
          } else if (results.length > 0) {
            const balance = results[0].balance;
            bot.sendMessage(chatId, `Your current balance is ETB ${balance}.`);
          } else {
            bot.sendMessage(chatId, "You are not registered. Please register first.");
          }
        }
      );
      break;

    case "support":
      bot.sendMessage(chatId, "For support, please visit our channel: https://t.me/shanetbingoo");
      break;

    case "instructions":
      bot.sendMessage(chatId, "Welcome to Shanet Bingo! Here’s how to play:\n1. Register and check your balance.\n2. Choose a play amount.\n3. Enjoy the game!");
      break;

    case "play_10":
    case "play_20":
    case "play_50":
    case "play_100":
    case "play_0":
      const playAmount = parseInt(query.data.split("_")[1], 10) || 0;

      db.query(
        "SELECT balance FROM users WHERE telegram_id = ?",
        [chatId],
        (error, results) => {
          if (error) {
            console.error("Error fetching balance:", error);
            bot.sendMessage(chatId, "There was an error processing your request. Please try again.");
          } else if (results.length > 0) {
            const balance = results[0].balance;

            if (playAmount === 0 || balance >= playAmount) {
              const gameUrl = `http://172.20.10.11/bc?chat_id=${chatId}&play=${playAmount}`;
              bot.sendMessage(chatId, `Starting game with play amount ${playAmount}... ${gameUrl}`);
            } else {
              bot.sendMessage(
                chatId,
                `You need ETB ${playAmount} to play this amount, but you only have ETB ${balance}. Please deposit more funds or choose a lower amount.`
              );
            }
            
          } else {
            bot.sendMessage(chatId, "No account found. Please register first.");
          }
        }
      );
      break;

    default:
      bot.sendMessage(chatId, "Unknown command. Please try again.");
  }

  // Answer the callback to remove loading indicator
  bot.answerCallbackQuery(query.id);
});

// Handle registration flow for phone number input
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const userState = userStates[chatId];

  if (userState && userState.step === "awaiting_registration_phone") {
    const phoneNumber = msg.text;

    db.query(
      "INSERT INTO users (telegram_id, phone_number) VALUES (?, ?)",
      [chatId, phoneNumber],
      (error, results) => {
        if (error) {
          console.error("Error registering user:", error);
          bot.sendMessage(chatId, "There was an error registering you. Please try again.");
        } else {
          bot.sendMessage(chatId, "Registration successful! You can now check your balance or start playing.");
          delete userStates[chatId]; // Clear user state after registration
        }
      }
    );
  }
});

