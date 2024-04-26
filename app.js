require('dotenv').config();
const {Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require('discord.js');

const { connectToDatabase } = require('./db');
const { User } = require('./user');
const { GuildSettings } = require('./user');

//const express = require('express');
const axios = require('axios');
//const app = express();
const PORT = process.env.PORT || 8080;

var cron = require('node-cron');


const fetchNutritionInfo = async (query) => {
  
  const url = `https://api.api-ninjas.com/v1/nutrition?query=${encodeURIComponent(query)}`;

  try {
      const response = await axios.get(url, {
          headers: {
              'X-Api-Key': process.env.apiKey,
              'Content-Type': 'application/json'
          }
      });
      return response.data;
  } catch (error) {
      throw new Error('Error fetching nutrition information');
  }
};
// Connect to MongoDB
connectToDatabase();

const client = new Client({ intents: [ 
  GatewayIntentBits.DirectMessages,
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,] });

  const fetchRandomQuote = async () => {
    try {
        const response = await axios.get('https://zenquotes.io/api/quotes');
        const { q: quote, a: author } = response.data[0];
        return `"${quote}"\n\n- *${author}*`;
    } catch (error) {
        console.error('Error fetching quote:', error.message);
        return 'An error occurred while fetching the quote.';
    }
};

const sendRandomQuote = async (channel) => {
    try {
        const quote = await fetchRandomQuote();
        return quote;
    } catch (error) {
        console.error(error);
        return '';
    }
};


const workouts = {
    "Squats": "Stand with your feet shoulder-width apart and squat down as if you're sitting back into a chair, then stand back up.",
    "Push-Ups": "Get into a plank position with your hands shoulder-width apart, lower your body until your chest nearly touches the floor, then push back up.",
    "Lunges": "Step forward with one leg, lowering your hips until both knees are bent at about a 90-degree angle, then return to the starting position and repeat with the other leg.",
    "Plank": "Get into a push-up position but with your weight on your forearms, keep your body in a straight line from head to heels, hold for as long as you can.",
    "Jumping Jacks": "Start with your feet together and arms at your sides, then jump while bringing your legs out to the side and raising your arms overhead.",
    "Mountain Climbers": "Start in a plank position, then alternate bringing each knee towards your chest as if you're climbing a mountain.",
    "Burpees": "Start standing, then squat down, kick your feet back into a plank position, do a push-up, jump your feet back to your hands, and then jump up explosively with your arms overhead.",
    "High Knees": "Stand in place and alternate quickly bringing each knee up towards your chest.",
    "Russian Twists": "Sit on the floor with your knees bent and feet lifted, then twist your torso from side to side, touching the floor beside you with each hand.",
    "Superman": "Lie face down on the floor with your arms extended in front of you, then lift your arms, chest, and legs off the ground as high as you can, hold for a moment, then lower back down.",
    "Leg Raises": "Lie on your back with your legs straight, then lift your legs up towards the ceiling while keeping them straight, lower them back down without letting them touch the floor.",
    "Tricep Dips": "Sit on the edge of a chair or bench with your hands gripping the edge, then scoot your hips off the edge and lower your body by bending your elbows, then push back up.",
    "Wall Sits": "Lean your back against a wall and slide down until your thighs are parallel to the ground, hold this position for as long as you can.",
    "Squat Jumps": "Perform a regular squat, but instead of standing up, explode upward into a jump, then land softly back into the squat position.",
    "Side Plank": "Lie on your side with your legs straight and prop yourself up on your elbow, lift your hips until your body forms a straight line from head to heels, hold for as long as you can, then switch sides.",
    "Calf Raises": "Stand with your feet hip-width apart and rise up onto the balls of your feet, then lower back down and repeat."
};
function getRandomDuration() {
    const durations = [25, 30, 40];
    const randomIndex = Math.floor(Math.random() * durations.length);
    return durations[randomIndex];
}

function getRandomRepetitions() {
    const repetitions = [10, 15, 20];
    const randomIndex = Math.floor(Math.random() * repetitions.length);
    return repetitions[randomIndex];
}

function getRandomWorkouts() {
    const workoutKeys = Object.keys(workouts);
    const randomWorkouts = [];
    for (let i = 0; i < 5 && workoutKeys.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * workoutKeys.length);
        const workoutName = workoutKeys[randomIndex];
        let workoutTutorial = workouts[workoutName];
        if (workoutName === "Plank") {
            workoutTutorial = `Get into a push-up position but with your weight on your forearms, keep your body in a straight line from head to heels, hold for **${getRandomDuration()} seconds.**`;
        } else if (workoutName === "High Knees") {
            workoutTutorial = `Stand in place and alternate quickly bringing each knee up towards your chest for **${getRandomDuration()} seconds.**`;
        }
        else {
            workoutTutorial += ` Perform **${getRandomRepetitions()} repetitions.**`;
        }
        randomWorkouts.push({ name: workoutName, tutorial: workoutTutorial });
        workoutKeys.splice(randomIndex, 1);
    }
    return randomWorkouts;
}

const sendRandomWorkout = async (channel) => {
    try {
        const workouts = await getRandomWorkouts();
    
        let workoutMessage = '**DAILY WORKOUT CHALLENGE**\n\n';
        for (const workout of workouts) {
            workoutMessage += `**${workout.name}**: ${workout.tutorial}\n`;
        }

        await channel.send(workoutMessage);
    } catch (error) {
        console.error(error);
    }
};

cron.schedule('0 7 * * *', async () => {
    console.log('Running a task every day');

    const guildSettingsList = await GuildSettings.find();

    for (const guildSettings of guildSettingsList) {
        const guildId = guildSettings.guildId;
        const channelId = guildSettings.channelId;

        const channel = await client.channels.fetch(channelId);
        
        if (!channel) {
            console.error(`Channel not found for guild ${guildId}.`);
            continue; 
        }
        await channel.send(`@everyone\n**QUOTE OF THE DAY**\n\n${await sendRandomQuote(channel)}`);

        setTimeout(async () => {
            sendRandomWorkout(channel);
        }, 2000);
    }
});

cron.schedule('0 7 * * *', async () => {
    const guildSettingsList = await GuildSettings.find();

    for (const guildSettings of guildSettingsList) {
        const channelId = guildSettings.channelId;

        const channel = await client.channels.fetch(channelId);
        
        if (!channel) {
            console.error(`Channel not found for guild ${guildSettings.guildId}.`);
            continue;
        }

        const users = await User.find(); 

        for (const user of users) {
            const discordUser = await client.users.fetch(user.discordId);

            switch (user.remindersTime) {
                case 'never':
                    break;
                case 'daily':
                    if (discordUser) {
                        discordUser.send(`What's up man. \n Daily reminder:\nYour fitness goal is: ${user.fitnessGoal}\nYour health goal is: ${user.healthGoal}\n Good luck bro`);
                    } else {
                        console.error('Discord user not found for user:', user.username);
                    }
                    break;
                case 'weekly':
                    const today = new Date();
                    if (today.getDay() === 1 && discordUser) {
                        discordUser.send(`Weekly reminder:\nYour fitness goal is: ${user.fitnessGoal}\nYour health goal is: ${user.healthGoal}`);
                    }
                    break;
                case 'monthly':
                    const now = new Date();
                    const isFirstDayOfMonth = now.getDate() === 1;
                    if (isFirstDayOfMonth && discordUser) {
                        discordUser.send(`Monthly reminder:\nYour fitness goal is: ${user.fitnessGoal}\nYour health goal is: ${user.healthGoal}`);
                    }
                    break;
                default:
                    console.error('Invalid remindersTime for user:', user.username);
            }
        }
    }
});


const saveGoals = async (message) => {
    let healthGoal = 'None', fitnessGoal = 'None', remindersTime;

    const askForHealthGoal = async () => {
        const skipButton = new ButtonBuilder()
            .setCustomId('skip_health_goal')
            .setLabel('Skip')
            .setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder()
            .addComponents(skipButton);
    
        const promptHealthGoal = async () => {
            const healthGoalMessage = await message.reply({
                content: 'What is your health goal? (You can also click "Skip" to skip this question.)',
                components: [row]
            });
    
            const buttonCollector = healthGoalMessage.createMessageComponentCollector({ time: 120000 });
            buttonCollector.on('collect', async (interaction) => {
                if (interaction.customId === 'skip_health_goal') {
                    healthGoal = 'None';
                    await interaction.update({ content: 'Health goal skipped.', components: [] });
                    buttonCollector.stop();
                    await askForFitnessGoal();
                }
            });
    
            const messageCollector = message.channel.createMessageCollector({
                filter: (m) => m.author.id === message.author.id,
                time: 60000,
                max: 1
            });
    
            messageCollector.on('collect', async (m) => {
                const content = m.content.trim();
                if (content === '!cancel') {
                   
                    await m.reply("Profile creation/update process canceled.");
                    messageCollector.stop();
                    buttonCollector.stop();
                    return;
                } else if (content.startsWith('!')) {
                    await m.reply("Commands are not valid inputs. Please enter a valid response. (type '!cancel' to exit)");
                    messageCollector.stop();
                    askForHealthGoal(); 
                    
                } else if (content.length > 950) {
                    await m.reply("Your input is too long! Please limit your health goal to 1000 characters or less.");
                    messageCollector.stop();
                    askForHealthGoal();

                } else if (!content) {
                    await m.reply("Your message is empty. Please provide a valid input.");
                    return;
                    
                } else {
                    healthGoal = content || 'None';
                    await askForFitnessGoal();
                }
                buttonCollector.stop();
            });
        };

        promptHealthGoal();
    };

    const askForFitnessGoal = async () => {
        const skipButton = new ButtonBuilder()
            .setCustomId('skip_fitness_goal')
            .setLabel('Skip')
            .setStyle(ButtonStyle.Primary);
        const backButton = new ButtonBuilder()
            .setCustomId('back_to_health_goal')
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary);
        const row = new ActionRowBuilder()
            .addComponents(skipButton, backButton);
    
        const promptFitnessGoal = async () => {
            const fitnessGoalMessage = await message.reply({
                content: 'What is your fitness goal? (You can skip this question or go back.)',
                components: [row]
            });
    
            const buttonCollector = fitnessGoalMessage.createMessageComponentCollector({ time: 120000 });
            buttonCollector.on('collect', async (interaction) => {
                if (interaction.customId === 'skip_fitness_goal') {
                    fitnessGoal = 'None';
                    await interaction.update({ content: 'Fitness goal skipped.', components: [] });
                    buttonCollector.stop();
                    await askForReminderTime();
                } else if (interaction.customId === 'back_to_health_goal') {
                    await interaction.update({ content: 'Returning to health goal.', components: [] });
                    buttonCollector.stop();
                    await askForHealthGoal();
                }
            });
    
            const messageCollector = message.channel.createMessageCollector({
                filter: (m) => m.author.id === message.author.id,
                time: 60000,
                max: 1
            });
    
            messageCollector.on('collect', async (m) => {
                const content = m.content.trim();
                if (content === '!cancel') {
                   
                    await m.reply("Profile creation/update process canceled.");
                    messageCollector.stop();
                    buttonCollector.stop();
                    return;
                } else if (content.startsWith('!')) {
                    await m.reply("Commands are not valid inputs. Please enter a valid response.");
                    messageCollector.stop();
                    promptFitnessGoal(); 
                } else if (content.length > 950) {
                    await m.reply("Your input is too long! Please limit your fitness goal to 1000 characters or less.");
                    messageCollector.stop();
                    promptFitnessGoal();
                } else {
                    fitnessGoal = content || 'None';
                    await askForReminderTime();
                
                }
            });
        };

        promptFitnessGoal();
    };
    const askForReminderTime = async () => {
        const neverButton = new ButtonBuilder()
            .setCustomId('never')
            .setLabel('Never')
            .setStyle(ButtonStyle.Primary);
    
        const dailyButton = new ButtonBuilder()
            .setCustomId('daily')
            .setLabel('Daily')
            .setStyle(ButtonStyle.Primary);
    
        const weeklyButton = new ButtonBuilder()
            .setCustomId('weekly')
            .setLabel('Weekly')
            .setStyle(ButtonStyle.Primary);
    
        const monthlyButton = new ButtonBuilder()
            .setCustomId('monthly')
            .setLabel('Monthly')
            .setStyle(ButtonStyle.Primary);
    
        const backButton = new ButtonBuilder()
            .setCustomId('back_to_fitness_goal')
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder()
            .addComponents(neverButton, dailyButton, weeklyButton, monthlyButton, backButton);
    
        const reminderTimeMessage = await message.reply({
            content: 'How often do you want to be reminded?',
            components: [row]
        });
    
        const buttonCollector = reminderTimeMessage.createMessageComponentCollector({
            
            filter: (interaction) => interaction.user.id === message.author.id,
            time: 60000
        });
        buttonCollector.on('collect', async (interaction) => {
            if (interaction.customId === 'back_to_fitness_goal') {
                await interaction.update({ content: 'Returning to fitness goal.', components: [] });
                buttonCollector.stop();
                await askForFitnessGoal();
            } else {
                remindersTime = interaction.customId;
                const newUser = new User({
                    discordId: message.author.id,
                    healthGoal: healthGoal,
                    fitnessGoal: fitnessGoal,
                    remindersTime: remindersTime
                });
                await newUser.save();
                await interaction.update({
                    content: `Your health and fitness goals, along with reminder time set to '${remindersTime}', have been set!`,
                    components: []
                });
                buttonCollector.stop();
            }
        });
    };

    await askForHealthGoal();
};
client.on('messageCreate', async (message) => {
  if (message.content === '!createprofile') {
      const existingUser = await User.findOne({ discordId: message.author.id });

      if (existingUser) {
          message.reply('You already have a profile!');
      } else {
          saveGoals(message);
      }
  }
  if (message.content === '!setchannel') {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      message.reply('You do not have permission to set the channel.');
      return;
    }

    const guildId = message.guild.id;
    const channelId = message.channel.id;

    let guildSettings = await GuildSettings.findOne({ guildId });

    if (!guildSettings) {
      guildSettings = new GuildSettings({ guildId, channelId });
    } else {
      guildSettings.channelId = channelId;
    }

    await guildSettings.save();

    message.reply(`Messages will now be sent to this channel (${message.channel.name}).`);
  }
  if (message.content === '!goal') {
    const user = await User.findOne({ discordId: message.author.id });

    if (user) {
        message.reply(`Your current health goal is: ${user.healthGoal}\nYour current fitness goal is: ${user.fitnessGoal}`);
        //message.reply(`Your current fitness goal is: ${user.fitnessGoal}`);
    } else {
        message.reply('You need to create a profile first!');
    }
}  else if (message.content === '!changegoal') {
    const user = await User.findOne({ discordId: message.author.id });
  
          if (user) {
              message.reply("Which goal would you like to change? (Type 'fitness' or 'health')");
              const filter = (m) => m.author.id === message.author.id;
              const collector = message.channel.createMessageCollector({ filter, time: 60000 });
  
              collector.on('collect', async (m) => {
                  const goalType = m.content.toLowerCase();
                  if (goalType === 'fitness' || goalType === 'health') {
                      message.reply(`What would you like to change your ${goalType} goal to?`);
                      const goalCollector = message.channel.createMessageCollector({ filter, time: 60000 });
  
                      goalCollector.on('collect', async (goalMessage) => {
                          if (goalType === 'fitness') {
                              user.fitnessGoal = goalMessage.content;
                              await user.save();
                              message.reply(`Your fitness goal has been changed to: ${goalMessage.content}`);
                          } else {
                              user.healthGoal = goalMessage.content;
                              await user.save();
                              message.reply(`Your health goal has been changed to: ${goalMessage.content}`);
                          }
                          goalCollector.stop();
                      });
  
                      goalCollector.on('end', (collected, reason) => {
                          if (reason === 'time') {
                              message.reply('You took too long to respond.');
                          }
                      });
                  } else {
                      message.reply("Invalid goal type. Please type 'fitness' or 'health'.");
                  }
                  collector.stop();
              });
  
              collector.on('end', (collected, reason) => {
                  if (reason === 'time') {
                      message.reply('You took too long to respond.');
                  }
              });
            }
            } else if (message.content === '!changereminder') {
    const user = await User.findOne({ discordId: message.author.id });

    if (user) {
        const buttons = ['never', 'daily', 'weekly', 'monthly'].map(period =>
            new ButtonBuilder()
                .setCustomId(period)
                .setLabel(period.charAt(0).toUpperCase() + period.slice(1))
                .setStyle(ButtonStyle.Primary)
        );
        const row = new ActionRowBuilder().addComponents(buttons);

        const reminderMessage = await message.reply({
            content: 'How often would you like to be reminded?',
            components: [row]
        });

        const filter = (i) => i.user.id === message.author.id;
        const collector = reminderMessage.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (interaction) => {
            const reminderSetting = interaction.customId;

            await User.findOneAndUpdate(
                { discordId: message.author.id },
                { remindersTime: reminderSetting },
                { new: true }
            );

            await interaction.update({
                content: `Your reminder setting has been updated to: ${reminderSetting}.`,
                components: []
            });

            collector.stop(); 
        });
    } else {
        await message.reply('You need to create a profile first!');
    }

    } else if (message.content === '!changereminder') {
        const neverButton = new ButtonBuilder()
            .setCustomId('never')
            .setLabel('Never')
            .setStyle(ButtonStyle.Primary);
    
        const dailyButton = new ButtonBuilder()
            .setCustomId('daily')
            .setLabel('Daily')
            .setStyle(ButtonStyle.Primary);
    
        const weeklyButton = new ButtonBuilder()
            .setCustomId('weekly')
            .setLabel('Weekly')
            .setStyle(ButtonStyle.Primary);
    
        const monthlyButton = new ButtonBuilder()
            .setCustomId('monthly')
            .setLabel('Monthly')
            .setStyle(ButtonStyle.Primary);
    
        const row = new ActionRowBuilder()
            .addComponents(neverButton, dailyButton, weeklyButton, monthlyButton);
    
        const reminderMessage = await message.reply({
            content: 'How often would you like to be reminded?',
            components: [row]
        });

        const filter = (i) => i.user.id === message.author.id;
        const collector = reminderMessage.createMessageComponentCollector({ filter, time: 60000 });
    
        collector.on('collect', async (interaction) => {
            const reminderSetting = interaction.customId;
    
            const user = await User.findOneAndUpdate(
                { discordId: message.author.id },
                { remindersTime: reminderSetting },
                { new: true }
            );

            
    
            if (user) {
                await interaction.update({
                    content: `Your reminder setting has been updated to: ${reminderSetting}`,
                    components: []
                });
            } else {
                await interaction.update({
                    content: 'You need to create a profile first!',
                    components: []
                });
            }
    
            collector.stop(); 
        });
    
    } else if (message.content === '!food') {
      message.reply('What food would you like to search for?');

      const filter = (m) => m.author.id === message.author.id;
      const collector = message.channel.createMessageCollector({ filter, time: 60000 }); 

      collector.on('collect', async (m) => {
          try {
              const nutritionInfo = await fetchNutritionInfo(m.content);

              if (!nutritionInfo || nutritionInfo.length === 0) {
                message.reply('Sorry, the nutrition information for that food was not found.');
                return;
            }

              const formattedInfo = nutritionInfo.map(item => {
                return `
                Name: ${item.name}
                Calories: ${item.calories}
                Serving Size: ${item.serving_size_g} g
                Total Fat: ${item.fat_total_g} g
                Saturated Fat: ${item.fat_saturated_g} g
                Protein: ${item.protein_g} g
                Sodium: ${item.sodium_mg} mg
                Potassium: ${item.potassium_mg} mg
                Cholesterol: ${item.cholesterol_mg} mg
                Total Carbohydrates: ${item.carbohydrates_total_g} g
                Fiber: ${item.fiber_g} g
                Sugar: ${item.sugar_g} g
                `;
            }).join('\n\n');
            
            
              message.reply(`Here is the nutrition information for ${m.content}:\n${formattedInfo}`);
          } catch (error) {
              console.error(error);
              message.reply('An error occurred while fetching the nutrition information.');
          } finally {
              collector.stop();
          }
      });

      collector.on('end', (collected, reason) => {
          if (reason === 'time') {
              message.reply('You took too long to respond.');
          }
      });
    } else if (message.content === '!deleteprofile') {
      message.reply('Are you sure you want to delete your profile? (yes/no)');

        const filter = (m) => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({ filter, time: 60000 }); // 60s timeout

        collector.on('collect', async (m) => {
            if (m.content.toLowerCase() === 'yes') {
                const user = await User.findOneAndDelete({ discordId: message.author.id });
                
                if (user) {
                    message.reply('Your profile has been successfully deleted.');
                } else {
                    message.reply('You do not have a profile to delete.');
                }
            } else {
                message.reply('Profile deletion cancelled.');
            }

            collector.stop();
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                message.reply('You took too long to respond.');
            }
        });

    }

});


  client.login(process.env.TOKEN);