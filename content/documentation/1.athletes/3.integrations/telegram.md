---
title: Telegram Integration
description: Learn how to connect Coach Watts to Telegram and use it for quick training insights and analysis.
---

The Coach Watts Telegram integration allows you to chat with your coach directly from your favorite messaging app. It's perfect for quick questions about your training, nutrition, or checking your recovery status on the go.

## 1. Setup Guide

To link your Coach Watts account to Telegram:

1. Log in to your **Dashboard**.
2. Navigate to **Athlete Profile > Integrations**.
3. Locate the **Telegram** section and click **Link Account**.
4. A unique, temporary link or token will be generated.
5. Click the link to open Telegram, or send the `/start [your-token]` command directly to the **@CoachWattsBot**.

::alert{type="success"}
Success: Once linked, the bot will welcome you, and you can start chatting immediately.
::

## 2. Available Commands

The bot supports several commands to help you manage your interaction:

- `/help`: Displays a list of available commands and a brief overview of what the coach can do.
- `/start`: Used initially to link your account or to restart the conversation if you've disconnected.
- `/roominfo`: Shows the current Chat Room ID. Coach Watts organizes conversations into "Rooms" (sessions) to maintain context.

## 3. How it Works

### Chat Sessions

To keep your conversations focused and efficient, Coach Watts uses **Session Rooms**.

- If you haven't chatted for more than **6 hours**, a new room will be automatically created.
- This ensures the AI isn't overwhelmed by weeks of old context while still remembering recent instructions.

### What to Ask

You can ask anything you would normally ask in the main Coach Watts Chat:

- "How did my workout look today?"
- "What should I eat before my long run tomorrow?"
- "I'm feeling a bit tired, should I adjust my intensity?"

## 4. Troubleshooting

- **Expired Token**: If your `/start` token expires, simply generate a new one from the **Dashboard**.
- **Not Responding**: If the bot doesn't respond, try sending `/help` to verify the connection, or check your integration status on the Dashboard.
- **Disconnecting**: To stop receiving messages on Telegram, you can delete the integration from your **Dashboard** or block the bot in Telegram.
