# Whiz POS Sync & Logic Repair Guide

This report explains the "Perfect Logic" needed to fix the communication problems between your Main Server and your Outlets. Imagine the Server is the Parent and the Outlets are the Children. They need to talk to each other clearly so everyone knows what is happening.

---

## 1. The "Secret Handshake" (Connection & Identity)

### The Problem
Sometimes the Server doesn't know if an Outlet is awake or sleeping (Offline vs. Online).

### The Perfect Logic
- **The Constant Ping**: The Outlet should shout "I'm here!" every 5 seconds. The Server should write down the exact time it heard this shout.
- **The "Are You Awake?" Rule**: If the Server hasn't heard from an Outlet for more than 10 seconds, it should mark that Outlet as "Napping" (Offline).
- **The Unique Name Tag**: Every Outlet must have one unique "ID Number" that never changes, even if the Outlet restarts. When the Outlet talks to the Server, it must always show its Name Tag first.

---

## 2. The "Private Club" (Assignments)

### The Problem
When you choose 0 users or 0 products, the Outlet gets *everything*. This happens because the "Filter" is broken. It thinks "If I don't have a list, I should show everything."

### The Perfect Logic
- **The "Strict List" Rule**: The Server must have a special list for every Outlet.
- **The "Empty means Empty" Rule**: If the list for an Outlet is empty, the Server should send *nothing* to that Outlet.
- **The Filtered Delivery**: When the Server sends data, it must look at the Outlet's Name Tag, check its "Strict List," and only send the items on that list. It should never say "Since you have no list, take everything."

---

## 3. The "Magic Backpack" (Stock Management)

### The Problem
The Outlets are looking into the Server’s "Big Warehouse" (Main Stock) instead of their own "Backpack" (Outlet Stock).

### The Perfect Logic
- **The Isolation Rule**: An Outlet should *never* be allowed to see how many items are in the Main Warehouse. It only cares about what is in its own Backpack.
- **The Starting Amount**: When an Outlet is approved, the Server puts a specific number of items in that Outlet's Backpack.
- **The Zero Default**: If a product is not in the Outlet's Backpack, the stock count for that product at that Outlet must be **Zero**, not the Main Warehouse's amount.
- **The Sale Subtraction**: When a sale happens at the Outlet, the Outlet subtracts from its *own* Backpack. It then tells the Server: "I sold 1 item from my Backpack." The Server then updates its record of that Outlet's Backpack.

---

## 4. The "Message Bridge" (Syncing)

### The Problem
Messages are getting lost. When the Outlet sells something, the Server doesn't hear about it. When the Server changes a price, the Outlet doesn't see it.

### The Perfect Logic
- **The Post Office (Server → Outlet)**: Whenever *anything* changes on the Server (like a price or a new customer), the Server looks at all its connected Outlets. For each Outlet, it checks: "Is this change important for this specific child?" If yes, it sends a private message to *only* that child.
- **The Delivery Receipt (Outlet → Server)**: When an Outlet makes a sale or adds an expense, it puts it in a "Pending Box." It tries to send the box to the Server.
- **The Double Check**: The Server must say "I got it!" (Acknowledgment) after it successfully saves the message. The Outlet only empties its "Pending Box" *after* it hears the Server say "I got it!"
- **The Catch-Up**: If the "Bridge" (Internet/Network) is broken, the items stay in the "Pending Box." As soon as the Bridge is fixed, the Outlet sends everything in the box at once.

---

## 5. The "Housekeeping" (Errors & Permissions)

### The Problem
The app is getting "Access Denied" errors. This is like trying to put a toy in a box that is locked.

### The Perfect Logic
- **The Private Folder**: Instead of trying to save things in the computer's "System Folders" (which are often locked), the app should only save things in the "User's Own Folder."
- **Clean Start**: Every time the app starts, it should check if it has permission to write in its folder. If it doesn't, it should try to create a new folder where it *is* allowed to play.
- **Turning off the Extra Features**: On some computers, the "GPU" (the part that makes pretty pictures) tries to save its own secret files and fails. The app should tell the computer: "Don't worry about saving those pretty-picture files, we don't need them."

---

## Summary of the New Logic Flow

1. **Outlet starts up** and finds the Server.
2. **Server gives the Outlet a "Backpack"** with only the assigned Products and Users.
3. **If 0 are assigned**, the Backpack is **Empty**.
4. **The Outlet only looks inside its own Backpack** for stock levels.
5. **Every time a sale happens**, the Outlet puts it in a "Pending Box" and sends it to the Server.
6. **The Server says "Got it!"** and the Outlet clears the box.
7. **If the Server changes something**, it sends a "Special Note" to the specific Outlet it affects.
8. **Every 5 seconds**, they wave at each other to make sure they are both still there.
