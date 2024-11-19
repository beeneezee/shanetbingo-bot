// Import required libraries
const TelegramBot = require("node-telegram-bot-api");
const path = require("path"); // Required to resolve the file path
const db = require("./db"); // Import your database connection
require('dotenv').config(); //load the env variables


const token = process.env.TELEGRAM_BOT_TOKEN; // Use the token from .env
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY; // Use the Chapa secret key
; // Replace this with your token
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
        [
          // { text: "Invite 🔗", callback_data: "invite" },
          { text: "Withdraw 💰", callback_data: "withdraw" },
        ],
      ],
    },
  });
});

// Required libraries
const axios = require("axios"); // Axios for HTTP requests

// Chapa configuration
// const CHAPA_SECRET_KEY = "CHASECK_TEST-9duPIK95rlTznLfnsuZpKYMnITUbwx5i"; // Replace with your Chapa secret key
const CHAPA_WITHDRAW_URL = "https://api.chapa.co/v1/transfers"; // Chapa withdrawal API endpoint

const generateReference = () => {
  const timestamp = Date.now(); // Get the current timestamp
  return `sb${timestamp}`;      // Prefix 'sb' and append the timestamp
};

// /withdraw command handling
bot.onText(/\/withdraw/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    // Fetch user details
    db.query(
      "SELECT username, phone_number, balance FROM users WHERE telegram_id = ?",
      [chatId],
      async (error, results) => {
        if (error) {
          console.error("Error fetching user data:", error);
          bot.sendMessage(chatId, "There was an error processing your request. Please try again later.");
          return;
        }

        if (results.length === 0) {
          bot.sendMessage(chatId, "No account found. Please register first.");
          return;
        }

        const { username, phone_number, balance } = results[0];

        // Check if the user has sufficient balance
        const withdrawalAmount = 100; // Example: Set the withdrawal amount (can be user input)
        if (balance < withdrawalAmount) {
          bot.sendMessage(chatId, `Insufficient balance. Your current balance is ETB ${balance}.`);
          return;
        }

        var request = require('request');
        var options = {
          'method': 'POST',
          'url': 'https://api.chapa.co/v1/transfers',
          'headers': {
          'Authorization': CHAPA_SECRET_KEY,
          'Content-Type': 'application/json'
            },
            body: JSON.stringify({
          "account_name": "Bee",
          "account_number": "324253423",
          "amount": withdrawalAmount,
          "currency": "ETB",
          "reference": generateReference(),
          "bank_code": '001'
            })

        };
        request(options, function (error, response) {
          if (error) throw new Error(error);
          console.log(response.body);
        });
  

        // Initiate Chapa withdrawal
        // try {
        //   const chapaResponse = await axios.post(
        //     CHAPA_WITHDRAW_URL,
        //     {
        //       account_name: username,
        //       account_number: phone_number,
        //       amount: withdrawalAmount,
        //       currency: "ETB",
        //       reason: "Bingo withdrawal", // Optional              
        //       bank_code: '001'
        //     },
        //     {
        //       headers: {
        //         Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
        //         "Content-Type": "application/json",
        //       },
        //     }
        //   );

        //   if (chapaResponse.data.status === "success") {
        //     // Update the user's balance in the database
        //     db.query(
        //       "UPDATE users SET balance = balance - ? WHERE telegram_id = ?",
        //       [withdrawalAmount, chatId],
        //       (updateError) => {
        //         if (updateError) {
        //           console.error("Error updating balance:", updateError);
        //           bot.sendMessage(chatId, "There was an error completing your withdrawal. Please try again later.");
        //           return;
        //         }

        //         bot.sendMessage(chatId, `🎉 Withdrawal successful! ETB ${withdrawalAmount} has been sent to your Chapa account.`);
        //       }
        //     );
        //   } else {
        //     bot.sendMessage(chatId, "Withdrawal failed. Please try again later.");
        //   }
        // } catch (chapaError) {
        //   console.error("Chapa API error:", chapaError.response?.data || chapaError.message);
        //   bot.sendMessage(chatId, "There was an error processing your withdrawal request. Please try again later.");
        // }
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    bot.sendMessage(chatId, "There was an unexpected error. Please try again later.");
  }
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
            userStates[chatId] = { step: "awaiting_registration_phone" };
          }
        }
      );
      break;

      case "deposit":
        db.query(
          "SELECT username, phone_number FROM users WHERE telegram_id = ?",
          [chatId],
          (error, results) => {
            if (error) {
              console.error("Error fetching user data:", error);
              bot.sendMessage(chatId, "There was an error processing your deposit request. Please try again later.");
            } else if (results.length > 0) {
              const username = results[0].username;
              const phoneNumber = results[0].phone_number;
      
              const miniAppUrl = `http://172.20.10.11/bc/chapa-deposit.php?chatId=${chatId}&username=${encodeURIComponent(username)}&phone_number=${encodeURIComponent(phoneNumber)}`;
      
              bot.sendMessage(chatId, "🍀 Deposit money via Chapa! 🍀", {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "Deposit Via Chapa", url: miniAppUrl }],
                  ],
                },
              });
            } else {
              bot.sendMessage(chatId, "No account found. Please register first.");
            }
          }
        );
        break;

        
      case "withdraw":
        db.query(
          "SELECT username, phone_number FROM users WHERE telegram_id = ?",
          [chatId],
          (error, results) => {
            if (error) {
              console.error("Error fetching user data:", error);
              bot.sendMessage(chatId, "There was an error processing your deposit request. Please try again later.");
            } else if (results.length > 0) {
              const username = results[0].username;
              const phoneNumber = results[0].phone_number;
      
              const miniAppUrl = `http://172.20.10.11/bc/chapa-withdraw.php?chatId=${chatId}&username=${encodeURIComponent(username)}&phone_number=${encodeURIComponent(phoneNumber)}`;
      
              bot.sendMessage(chatId, "🍀 Withdraw money via Chapa! 🍀", {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "Withdraw Via Chapa", url: miniAppUrl }],
                  ],
                },
              });
            } else {
              bot.sendMessage(chatId, "No account found. Please register first.");
            }
          }
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
                    {
                      text: "Play 10 🎮",
                      url: `http://172.20.10.11/bc?chat_id=${chatId}&play=10`,
                      web_app: { url: `http://172.20.10.11/bc?chat_id=${chatId}&play=10` }
                    },
                    {
                      text: "Play 20 🎮",
                      url: `http://172.20.10.11/bc?chat_id=${chatId}&play=20`,
                      web_app: { url: `http://172.20.10.11/bc?chat_id=${chatId}&play=20` }
                    }
                  ],
                  [
                    {
                      text: "Play 50 🎮",
                      url: `http://172.20.10.11/bc?chat_id=${chatId}&play=50`,
                      web_app: { url: `http://172.20.10.11/bc?chat_id=${chatId}&play=50` }
                    },
                    {
                      text: "Play 100 🎮",
                      url: `http://172.20.10.11/bc?chat_id=${chatId}&play=100`,
                      web_app: { url: `http://172.20.10.11/bc?chat_id=${chatId}&play=100` }
                    }
                  ],
                  [
                    {
                      text: "Play Demo 🎲",
                      url: `http://172.20.10.11/bc?chat_id=${chatId}&play=0`,
                      web_app: { url: `http://172.20.10.11/bc?chat_id=${chatId}&play=0` }
                    }
                  ]
                ]
              }
            }
          );
          
      break;

    case "play_10":
      bot.sendMessage(chatId, "You chose to play with 10 units. Good luck! 🎉");
      break;
    case "play_20":
      bot.sendMessage(chatId, "You chose to play with 20 units. Go for it! 🎉");
      break;
    case "play_50":
      bot.sendMessage(chatId, "You chose to play with 50 units. Best of luck! 🎉");
      break;
    case "play_100":
      bot.sendMessage(chatId, "You chose to play with 100 units. Big win ahead! 🎉");
      break;
    case "play_demo":
      bot.sendMessage(chatId, "You chose the demo mode. Have fun! 🎲");
      break;

    case "check_balance":
      db.query(
        "SELECT balance FROM users WHERE telegram_id = ?",
        [chatId],
        (error, results) => {
          if (error) {
            console.error("Error fetching balance:", error);
            bot.sendMessage(chatId, "There was an error fetching your balance. Please try again.");
          } else if (results.length > 0) {
            const balance = results[0].balance;
            bot.sendMessage(chatId, `Your current balance is: ETB ${balance}`);
          } else {
            bot.sendMessage(chatId, "No account found. Please register first.");
          }
        }
      );
      break;

    case "support":
      bot.sendMessage(chatId, "For support, please visit our channel: https://t.me/shanetbingoo");
      break;

    default:
      bot.sendMessage(chatId, "Unknown command. Please try again.");
  }

  // Answer the callback to remove loading indicator
  bot.answerCallbackQuery(query.id);
});

// /deposit command handling
bot.onText(/\/deposit/, async (msg) => {
  const chatId = msg.chat.id;

  try {

    db.query(
      "SELECT username, phone_number FROM users WHERE telegram_id = ?",
      [chatId],
      (error, results) => {
        if (error) {
          console.error("Error fetching balance:", error);
          bot.sendMessage(chatId, "There was an error processing your deposit request. Please try again later.");
        } else if (results.length > 0) {

      const username = results[0].username;
      const phoneNumber = results[0].phone_number;

      const miniAppUrl = `http://172.20.10.11/bc/chapa-deposit.php?chatId=${chatId}&username=${encodeURIComponent(username)}&phone_number=${encodeURIComponent(phoneNumber)}`;

      bot.sendMessage(chatId, "🍀 Deposit money via Chapa 🍀", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Deposit Via Chapa", url: miniAppUrl }],
          ],
        },
      });
      
        } else {
          bot.sendMessage(chatId, "No account found. Please register first.");
        }
      }
    );

  } catch (error) {
    console.error("Error fetching user data:", error);
    bot.sendMessage(chatId, "There was an error processing your deposit request. Please try again later.");
  }
});



// /deposit command handling
bot.onText(/\/withdraw/, async (msg) => {
  const chatId = msg.chat.id;

  try {

    db.query(
      "SELECT username, phone_number FROM users WHERE telegram_id = ?",
      [chatId],
      (error, results) => {
        if (error) {
          console.error("Error fetching balance:", error);
          bot.sendMessage(chatId, "There was an error processing your deposit request. Please try again later.");
        } else if (results.length > 0) {

      const username = results[0].username;
      const phoneNumber = results[0].phone_number;

      const miniAppUrl = `http://172.20.10.11/bc/chapa-withdraw.php?chatId=${chatId}&username=${encodeURIComponent(username)}&phone_number=${encodeURIComponent(phoneNumber)}`;

      bot.sendMessage(chatId, "🍀 Withdraw money via Chapa 🍀", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Withdraw Via Chapa", url: miniAppUrl }],
          ],
        },
      });
      
        } else {
          bot.sendMessage(chatId, "No account found. Please register first.");
        }
      }
    );

  } catch (error) {
    console.error("Error fetching user data:", error);
    bot.sendMessage(chatId, "There was an error processing your deposit request. Please try again later.");
  }
});



// /balance command handling
bot.onText(/\/balance/, (msg) => {
  const chatId = msg.chat.id;

  db.query(
    "SELECT balance FROM users WHERE telegram_id = ?",
    [chatId],
    (error, results) => {
      if (error) {
        console.error("Error fetching balance:", error);
        bot.sendMessage(chatId, "There was an error fetching your balance. Please try again.");
      } else if (results.length > 0) {
        const balance = results[0].balance;
        bot.sendMessage(chatId, `Your current balance is: ETB ${balance}`);
      } else {
        bot.sendMessage(chatId, "No account found. Please register first.");
      }
    }
  );
});

// /play command handling
bot.onText(/\/play/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    "🍀 Good luck! Choose your play amount and enjoy the game! 🍀",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Play 10 🎮",
              url: `http://172.20.10.11/bc?chat_id=${chatId}&play=10`,
              web_app: { url: `http://172.20.10.11/bc?chat_id=${chatId}&play=10` }
            },
            {
              text: "Play 20 🎮",
              url: `http://172.20.10.11/bc?chat_id=${chatId}&play=20`,
              web_app: { url: `http://172.20.10.11/bc?chat_id=${chatId}&play=20` }
            }
          ],
          [
            {
              text: "Play 50 🎮",
              url: `http://172.20.10.11/bc?chat_id=${chatId}&play=50`,
              web_app: { url: `http://172.20.10.11/bc?chat_id=${chatId}&play=50` }
            },
            {
              text: "Play 100 🎮",
              url: `http://172.20.10.11/bc?chat_id=${chatId}&play=100`,
              web_app: { url: `http://172.20.10.11/bc?chat_id=${chatId}&play=100` }
            }
          ],
          [
            {
              text: "Play Demo 🎲",
              url: `http://172.20.10.11/bc?chat_id=${chatId}&play=0`,
              web_app: { url: `http://172.20.10.11/bc?chat_id=${chatId}&play=0` }
            }
          ]
        ]
      }
    }
  );
  
});

// /support command handling
bot.onText(/\/support/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "For support, please visit our channel: https://t.me/shanetbingoo");
});

// /rename command to change username if telegram chatId matches telegram_id
bot.onText(/\/rename/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "Please provide your new username:");

  bot.once('message', (msg) => {
    const newUsername = msg.text;

    db.query(
      "UPDATE users SET username = ? WHERE telegram_id = ?",
      [newUsername, chatId],
      (error, results) => {
        if (error) {
          console.error("Database query error:", error);
          bot.sendMessage(chatId, "Error updating username. Please try again.");
          return;
        }

        bot.sendMessage(chatId, `Your username has been updated to ${newUsername}!`);
      }
    );
  });
});

// Default message handling
bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  // Check user state and handle responses based on current step
  if (userStates[chatId] && userStates[chatId].step === "awaiting_registration_phone") {
    const phoneNumber = msg.text;
    // Register user in the database
    db.query(
      "INSERT INTO users (telegram_id, phone_number) VALUES (?, ?)",
      [chatId, phoneNumber],
      (error, results) => {
        if (error) {
          console.error("Database insert error:", error);
          bot.sendMessage(chatId, "There was an error processing your registration. Please try again.");
          return;
        }

        bot.sendMessage(chatId, "Registration successful! You can now /play.");
        // Clear user state after successful registration
        delete userStates[chatId];
      }
    );
  } else if (!msg.text.startsWith("/")) {
    bot.sendMessage(chatId, "I'm here to assist you! Type /start to begin.");
  }
});
