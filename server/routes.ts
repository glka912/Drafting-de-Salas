import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRoomSchema, insertRoomItemSchema, insertItemSchema, insertColorThemeSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage for uploaded files
const storage_config = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    // Create a unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

// Filter to only accept JPEG and PNG files
const fileFilter = (_req: any, file: any, cb: any) => {
  // Accept jpeg/jpg/png files
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/jpg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: fileFilter
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from uploads directory
  app.use("/uploads", express.static(uploadDir));
  
  // Image upload endpoint
  app.post("/api/upload", upload.single("image"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Please upload a JPEG or PNG image file" });
      }
      
      // Get the URL for the uploaded file
      const fileUrl = `/uploads/${req.file.filename}`;
      
      // Return the file URL to the client
      res.json({ 
        url: fileUrl,
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Error uploading file" });
    }
  });
  
  // put application routes here
  // prefix all routes with /api

  // Get all rooms
  app.get("/api/rooms", async (_req, res) => {
    try {
      const rooms = await storage.getRooms();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  // Get random rooms
  app.get("/api/rooms/random", async (req, res) => {
    try {
      const count = parseInt(req.query.count as string) || 3;
      const rooms = await storage.getRandomRooms(count);
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch random rooms" });
    }
  });

  // Get room by ID
  app.get("/api/rooms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const room = await storage.getRoomById(id);
      
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch room" });
    }
  });

  // Get items for a specific room
  app.get("/api/rooms/:id/items", async (req, res) => {
    try {
      const roomId = parseInt(req.params.id);
      
      // Check if room exists
      const room = await storage.getRoomById(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      const items = await storage.getRoomItemsWithDetails(roomId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch room items" });
    }
  });
  
  // Get random items for a specific room
  app.get("/api/rooms/:id/random-items", async (req, res) => {
    try {
      const roomId = parseInt(req.params.id);
      
      // Check if room exists
      const room = await storage.getRoomById(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      // Determine how many items to show (default to 3 if not specified in the room)
      const itemsToShow = room.itemsToShow !== undefined ? room.itemsToShow : 3;
      
      // Se itemsToShow for 0, retorne uma lista vazia
      let randomItems: import("@shared/schema").RoomItemWithDetails[] = [];
      if (itemsToShow > 0) {
        // Use the storage method to get random items with details
        randomItems = await storage.getRandomRoomItemsWithDetails(roomId, itemsToShow);
      }
      
      res.json(randomItems);
    } catch (error) {
      console.error("Failed to fetch random room items:", error);
      res.status(500).json({ message: "Failed to fetch random room items" });
    }
  });

  // Create a new room
  app.post("/api/rooms", async (req, res) => {
    try {
      const result = insertRoomSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid room data", 
          errors: result.error.errors 
        });
      }
      
      const newRoom = await storage.createRoom(result.data);
      res.status(201).json(newRoom);
    } catch (error) {
      console.error("Failed to create room:", error);
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  // Update a room
  app.patch("/api/rooms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validate the input data
      const updateData = req.body;
      const result = insertRoomSchema.partial().safeParse(updateData);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid room data", 
          errors: result.error.errors 
        });
      }
      
      const updatedRoom = await storage.updateRoom(id, result.data);
      
      if (!updatedRoom) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      res.json(updatedRoom);
    } catch (error) {
      console.error("Failed to update room:", error);
      res.status(500).json({ message: "Failed to update room" });
    }
  });

  // Delete a room
  app.delete("/api/rooms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteRoom(id);
      
      if (!success) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete room:", error);
      res.status(500).json({ message: "Failed to delete room" });
    }
  });
  
  // Global Items API
  
  // Get all items
  app.get("/api/items", async (_req, res) => {
    try {
      const items = await storage.getItems();
      res.json(items);
    } catch (error) {
      console.error("Failed to fetch items:", error);
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });
  
  // Get item by ID
  app.get("/api/items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItemById(id);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      res.json(item);
    } catch (error) {
      console.error("Failed to fetch item:", error);
      res.status(500).json({ message: "Failed to fetch item" });
    }
  });
  
  // Create a new item
  app.post("/api/items", async (req, res) => {
    try {
      const result = insertItemSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid item data", 
          errors: result.error.errors 
        });
      }
      
      const newItem = await storage.createItem(result.data);
      res.status(201).json(newItem);
    } catch (error) {
      console.error("Failed to create item:", error);
      res.status(500).json({ message: "Failed to create item" });
    }
  });
  
  // Update an item
  app.patch("/api/items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validate the input data
      const updateData = req.body;
      const result = insertItemSchema.partial().safeParse(updateData);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid item data", 
          errors: result.error.errors 
        });
      }
      
      const updatedItem = await storage.updateItem(id, result.data);
      
      if (!updatedItem) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Failed to update item:", error);
      res.status(500).json({ message: "Failed to update item" });
    }
  });
  
  // Delete an item
  app.delete("/api/items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteItem(id);
      
      if (!success) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete item:", error);
      res.status(500).json({ message: "Failed to delete item" });
    }
  });
  
  // Room Item Assignments API
  
  // Assign an item to a room (new endpoint used by RoomItemForm)
  app.post("/api/rooms/:roomId/items", async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const { itemId, probability, canRepeat, maxRepeats } = req.body;
      
      if (!itemId) {
        return res.status(400).json({ message: "itemId is required" });
      }
      
      // Check if room exists
      const room = await storage.getRoomById(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      // Check if item exists
      const item = await storage.getItemById(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      // Create the assignment
      const assignment = await storage.assignItemToRoom(roomId, itemId, { 
        probability: probability !== undefined ? probability : 100,
        canRepeat: canRepeat !== undefined ? canRepeat : true,
        maxRepeats: maxRepeats !== undefined ? maxRepeats : 1
      });
      
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Failed to assign item to room:", error);
      res.status(500).json({ message: "Failed to assign item to room" });
    }
  });
  
  // Assign an item to a room (legacy endpoint)
  app.post("/api/rooms/:roomId/assign-item", async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const { itemId, probability, canRepeat } = req.body;
      
      if (!itemId) {
        return res.status(400).json({ message: "itemId is required" });
      }
      
      // Check if room exists
      const room = await storage.getRoomById(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      // Check if item exists
      const item = await storage.getItemById(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      // Create the assignment
      const assignment = await storage.assignItemToRoom(roomId, itemId, { 
        probability: probability !== undefined ? probability : 100,
        canRepeat: canRepeat !== undefined ? canRepeat : true
      });
      
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Failed to assign item to room:", error);
      res.status(500).json({ message: "Failed to assign item to room" });
    }
  });
  
  // Update a room item assignment
  app.patch("/api/room-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { probability, canRepeat, maxRepeats, isGuaranteed, name, description, imageUrl, rarity, itemId } = req.body;
      
      // First, update the room-item assignment properties
      const assignmentProps: {probability?: number, canRepeat?: boolean, maxRepeats?: number, isGuaranteed?: boolean} = {};
      if (probability !== undefined) assignmentProps.probability = probability;
      if (canRepeat !== undefined) assignmentProps.canRepeat = canRepeat;
      if (maxRepeats !== undefined) assignmentProps.maxRepeats = maxRepeats;
      if (isGuaranteed !== undefined) assignmentProps.isGuaranteed = isGuaranteed;
      
      // Update the room-item assignment
      const updatedAssignment = await storage.updateRoomItemAssignment(id, assignmentProps);
      
      if (!updatedAssignment) {
        return res.status(404).json({ message: "Room item assignment not found" });
      }
      
      // If item details are being updated, update the item as well
      let updatedItem = null;
      if (name || description || imageUrl || rarity) {
        const itemUpdateData: any = {};
        if (name !== undefined) itemUpdateData.name = name;
        if (description !== undefined) itemUpdateData.description = description;
        if (imageUrl !== undefined) itemUpdateData.imageUrl = imageUrl;
        if (rarity !== undefined) itemUpdateData.rarity = rarity;
        
        console.log("Updating item details:", updatedAssignment.itemId, itemUpdateData);
        
        // Only try to update if we have data to update
        if (Object.keys(itemUpdateData).length > 0) {
          // Update the item using the itemId from the assignment
          updatedItem = await storage.updateItem(updatedAssignment.itemId, itemUpdateData);
          console.log("Updated item:", updatedItem);
        }
      }
      
      // Get the full item details to include in the response
      const fullItemDetails = await storage.getItemById(updatedAssignment.itemId);
      
      // Return a response with both the assignment and the item details
      res.json({
        ...updatedAssignment,
        item: fullItemDetails || undefined,
        updatedFields: {
          assignment: Object.keys(assignmentProps),
          item: updatedItem ? Object.keys(updatedItem).filter(k => k !== 'id') : []
        }
      });
    } catch (error) {
      console.error("Failed to update room item assignment:", error);
      res.status(500).json({ message: "Failed to update room item assignment" });
    }
  });
  
  // Remove an item from a room
  app.delete("/api/room-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.removeItemFromRoom(id);
      
      if (!success) {
        return res.status(404).json({ message: "Room item assignment not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Failed to remove item from room:", error);
      res.status(500).json({ message: "Failed to remove item from room" });
    }
  });
  
  // Color Theme API
  
  // Get all color themes
  app.get("/api/color-themes", async (_req, res) => {
    try {
      const themes = await storage.getColorThemes();
      res.json(themes);
    } catch (error) {
      console.error("Failed to fetch color themes:", error);
      res.status(500).json({ message: "Failed to fetch color themes" });
    }
  });
  
  // Get default color theme
  app.get("/api/color-themes/default", async (_req, res) => {
    try {
      const theme = await storage.getDefaultColorTheme();
      
      if (!theme) {
        return res.status(404).json({ message: "No default color theme found" });
      }
      
      res.json(theme);
    } catch (error) {
      console.error("Failed to fetch default color theme:", error);
      res.status(500).json({ message: "Failed to fetch default color theme" });
    }
  });
  
  // Get color theme by ID
  app.get("/api/color-themes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const theme = await storage.getColorThemeById(id);
      
      if (!theme) {
        return res.status(404).json({ message: "Color theme not found" });
      }
      
      res.json(theme);
    } catch (error) {
      console.error("Failed to fetch color theme:", error);
      res.status(500).json({ message: "Failed to fetch color theme" });
    }
  });
  
  // Create a new color theme
  app.post("/api/color-themes", async (req, res) => {
    try {
      const result = insertColorThemeSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid color theme data", 
          errors: result.error.errors 
        });
      }
      
      const newTheme = await storage.createColorTheme(result.data);
      res.status(201).json(newTheme);
    } catch (error) {
      console.error("Failed to create color theme:", error);
      res.status(500).json({ message: "Failed to create color theme" });
    }
  });
  
  // Update a color theme
  app.patch("/api/color-themes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validate the input data
      const updateData = req.body;
      const result = insertColorThemeSchema.partial().safeParse(updateData);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid color theme data", 
          errors: result.error.errors 
        });
      }
      
      const updatedTheme = await storage.updateColorTheme(id, result.data);
      
      if (!updatedTheme) {
        return res.status(404).json({ message: "Color theme not found" });
      }
      
      res.json(updatedTheme);
    } catch (error) {
      console.error("Failed to update color theme:", error);
      res.status(500).json({ message: "Failed to update color theme" });
    }
  });
  
  // Delete a color theme
  app.delete("/api/color-themes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      try {
        const success = await storage.deleteColorTheme(id);
        
        if (!success) {
          return res.status(404).json({ message: "Color theme not found" });
        }
        
        res.status(204).send();
      } catch (error: any) {
        // Check if this is the default theme
        if (error.message === "Cannot delete the default color theme") {
          return res.status(400).json({ message: error.message });
        }
        throw error;
      }
    } catch (error) {
      console.error("Failed to delete color theme:", error);
      res.status(500).json({ message: "Failed to delete color theme" });
    }
  });
  
  // Set a color theme as default
  app.post("/api/color-themes/:id/set-default", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const theme = await storage.setDefaultColorTheme(id);
      
      if (!theme) {
        return res.status(404).json({ message: "Color theme not found" });
      }
      
      res.json(theme);
    } catch (error) {
      console.error("Failed to set default color theme:", error);
      res.status(500).json({ message: "Failed to set default color theme" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
