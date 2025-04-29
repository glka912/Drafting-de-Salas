import { 
  users, type User, type InsertUser,
  rooms, type Room, type InsertRoom,
  items, type Item, type InsertItem,
  roomItems, type RoomItem, type InsertRoomItem,
  colorThemes, type ColorTheme, type InsertColorTheme,
  type RoomItemWithDetails
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, sql, and } from "drizzle-orm";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Room methods
  async getRooms(): Promise<Room[]> {
    return db.select().from(rooms).orderBy(asc(rooms.id));
  }
  
  async getRoomById(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room || undefined;
  }
  
  async getRandomRooms(count: number): Promise<Room[]> {
    const allRooms = await this.getRooms();
    
    if (allRooms.length <= count) {
      return allRooms;
    }
    
    // Create a weighted probability array based on room probabilities
    const weightedRooms: Room[] = [];
    
    allRooms.forEach(room => {
      // Add the room to the weighted array based on its probability
      for (let i = 0; i < room.probability; i++) {
        weightedRooms.push(room);
      }
    });
    
    // Shuffle the weighted array
    const shuffled = [...weightedRooms].sort(() => 0.5 - Math.random());
    
    // Get 'count' unique rooms from the shuffled array
    const selectedRooms: Room[] = [];
    const selectedIds = new Set<number>();
    
    for (const room of shuffled) {
      if (selectedIds.has(room.id)) continue;
      
      selectedRooms.push(room);
      selectedIds.add(room.id);
      
      if (selectedRooms.length === count) break;
    }
    
    return selectedRooms;
  }
  
  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    // Make sure itemsToShow has a default value of 3 if not provided
    const roomData = {
      ...insertRoom,
      itemsToShow: insertRoom.itemsToShow || 3
    };
    
    const [room] = await db
      .insert(rooms)
      .values(roomData)
      .returning();
    return room;
  }
  
  async updateRoom(id: number, roomUpdate: Partial<InsertRoom>): Promise<Room | undefined> {
    const [updatedRoom] = await db
      .update(rooms)
      .set(roomUpdate)
      .where(eq(rooms.id, id))
      .returning();
    
    return updatedRoom || undefined;
  }
  
  async deleteRoom(id: number): Promise<boolean> {
    // First delete associated room items
    await db
      .delete(roomItems)
      .where(eq(roomItems.roomId, id));
    
    // Then delete the room
    const [deletedRoom] = await db
      .delete(rooms)
      .where(eq(rooms.id, id))
      .returning();
    
    return !!deletedRoom;
  }
  
  // Item methods
  async getItems(): Promise<Item[]> {
    return db.select().from(items).orderBy(asc(items.id));
  }
  
  async getItemById(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item || undefined;
  }
  
  async createItem(insertItem: InsertItem): Promise<Item> {
    const [item] = await db
      .insert(items)
      .values(insertItem)
      .returning();
    return item;
  }
  
  async updateItem(id: number, itemUpdate: Partial<InsertItem>): Promise<Item | undefined> {
    const [updatedItem] = await db
      .update(items)
      .set(itemUpdate)
      .where(eq(items.id, id))
      .returning();
    
    return updatedItem || undefined;
  }
  
  async deleteItem(id: number): Promise<boolean> {
    // First delete associated room items
    await db
      .delete(roomItems)
      .where(eq(roomItems.itemId, id));
    
    // Then delete the item
    const [deletedItem] = await db
      .delete(items)
      .where(eq(items.id, id))
      .returning();
    
    return !!deletedItem;
  }
  
  // Room Items methods
  async getRoomItemsWithDetails(roomId: number): Promise<RoomItemWithDetails[]> {
    const roomItemsList = await db
      .select()
      .from(roomItems)
      .where(eq(roomItems.roomId, roomId));
    
    const result: RoomItemWithDetails[] = [];
    
    for (const roomItem of roomItemsList) {
      const [item] = await db
        .select()
        .from(items)
        .where(eq(items.id, roomItem.itemId));
      
      if (item) {
        result.push({
          ...roomItem,
          item
        });
      }
    }
    
    return result;
  }
  
  async getRandomRoomItemsWithDetails(roomId: number, count: number): Promise<RoomItemWithDetails[]> {
    // Get room to check if randomizeRepeats is enabled
    const room = await this.getRoomById(roomId);
    if (!room) {
      throw new Error(`Room with ID ${roomId} not found`);
    }
    
    const allRoomItems = await this.getRoomItemsWithDetails(roomId);
    
    if (allRoomItems.length <= count) {
      return allRoomItems;
    }
    
    // Create a pool of items based on their probability
    let itemPool: RoomItemWithDetails[] = [];
    
    // For each item, add it to the pool based on its probability
    allRoomItems.forEach(roomItem => {
      // Higher probability means more chance of being selected
      const probability = roomItem.probability || 100;
      
      // Create a "weight" for each item based on its probability (1-100)
      const copies = Math.max(1, Math.floor(probability / 10));
      
      for (let i = 0; i < copies; i++) {
        itemPool.push(roomItem);
      }
    });
    
    // Shuffle the item pool
    itemPool = itemPool.sort(() => 0.5 - Math.random());
    
    // Select items up to count
    const selectedItems = new Map<number, RoomItemWithDetails>();
    // Track how many times each item has been selected
    const itemRepeatCounts = new Map<number, number>();
    const result: RoomItemWithDetails[] = [];
    
    // Keep picking items until we have enough or run out of options
    while (result.length < count && itemPool.length > 0) {
      // Take an item from the pool
      const roomItem = itemPool.shift()!;
      
      // Check if this item can be added based on repeat rules
      const currentRepeatCount = itemRepeatCounts.get(roomItem.itemId) || 0;
      
      // Skip if the item cannot repeat and has already been selected
      if (!roomItem.canRepeat && currentRepeatCount > 0) {
        continue;
      }
      
      // Skip if the item has reached its maximum repeats
      if (roomItem.canRepeat && currentRepeatCount >= (roomItem.maxRepeats || 1)) {
        continue;
      }
      
      // Add to result
      result.push(roomItem);
      
      // Update repeat count for this item
      itemRepeatCounts.set(roomItem.itemId, currentRepeatCount + 1);
      
      // If the room has randomizeRepeats enabled and this item can repeat,
      // and it hasn't reached its max repeats, add it back to the pool
      if (room.randomizeRepeats && roomItem.canRepeat && 
          currentRepeatCount + 1 < (roomItem.maxRepeats || 1) && 
          result.length < count) {
        itemPool.push(roomItem);
      }
    }
    
    return result;
  }
  
  async assignItemToRoom(roomId: number, itemId: number, properties: { probability?: number; canRepeat?: boolean; maxRepeats?: number }): Promise<RoomItem> {
    // Verify that room and item exist
    const room = await this.getRoomById(roomId);
    const item = await this.getItemById(itemId);
    
    if (!room || !item) {
      throw new Error("Room or item not found");
    }
    
    // Create the assignment
    const assignment: InsertRoomItem = {
      roomId,
      itemId,
      probability: properties.probability !== undefined ? properties.probability : 100,
      canRepeat: properties.canRepeat !== undefined ? properties.canRepeat : true,
      maxRepeats: properties.maxRepeats !== undefined ? properties.maxRepeats : 1,
    };
    
    // Check if assignment already exists
    const [existingAssignment] = await db
      .select()
      .from(roomItems)
      .where(and(
        eq(roomItems.roomId, roomId),
        eq(roomItems.itemId, itemId)
      ));
    
    if (existingAssignment) {
      // Update existing assignment
      const updatedAssignment = await this.updateRoomItemAssignment(existingAssignment.id, properties);
      if (!updatedAssignment) {
        throw new Error("Failed to update room item assignment");
      }
      return updatedAssignment;
    }
    
    // Create new assignment
    const [newAssignment] = await db
      .insert(roomItems)
      .values(assignment)
      .returning();
    
    return newAssignment;
  }
  
  async updateRoomItemAssignment(id: number, properties: { probability?: number; canRepeat?: boolean; maxRepeats?: number }): Promise<RoomItem | undefined> {
    const [updatedAssignment] = await db
      .update(roomItems)
      .set(properties)
      .where(eq(roomItems.id, id))
      .returning();
    
    return updatedAssignment || undefined;
  }
  
  async removeItemFromRoom(roomItemId: number): Promise<boolean> {
    const [deletedAssignment] = await db
      .delete(roomItems)
      .where(eq(roomItems.id, roomItemId))
      .returning();
    
    return !!deletedAssignment;
  }
  
  // Color Theme methods
  async getColorThemes(): Promise<ColorTheme[]> {
    return db.select().from(colorThemes).orderBy(asc(colorThemes.id));
  }
  
  async getColorThemeById(id: number): Promise<ColorTheme | undefined> {
    const [theme] = await db.select().from(colorThemes).where(eq(colorThemes.id, id));
    return theme || undefined;
  }
  
  async getDefaultColorTheme(): Promise<ColorTheme | undefined> {
    const [theme] = await db.select().from(colorThemes).where(eq(colorThemes.isDefault, true));
    return theme || undefined;
  }
  
  async createColorTheme(theme: InsertColorTheme): Promise<ColorTheme> {
    // If this is set as default or if it's the first theme
    if (theme.isDefault) {
      // Set all other themes to non-default
      await db
        .update(colorThemes)
        .set({ isDefault: false })
        .where(eq(colorThemes.isDefault, true));
    } else {
      // Check if there are any themes
      const themes = await this.getColorThemes();
      
      // If this is the first theme, make it default
      if (themes.length === 0) {
        theme.isDefault = true;
      }
    }
    
    const [newTheme] = await db
      .insert(colorThemes)
      .values({
        ...theme,
        // Ensure isDefault is always a boolean
        isDefault: theme.isDefault === undefined ? false : theme.isDefault
      })
      .returning();
    
    return newTheme;
  }
  
  async updateColorTheme(id: number, themeUpdate: Partial<InsertColorTheme>): Promise<ColorTheme | undefined> {
    // Handle default theme changes
    if (themeUpdate.isDefault) {
      // Set all other themes to non-default
      await db
        .update(colorThemes)
        .set({ isDefault: false })
        .where(eq(colorThemes.isDefault, true));
    }
    
    const [updatedTheme] = await db
      .update(colorThemes)
      .set(themeUpdate)
      .where(eq(colorThemes.id, id))
      .returning();
    
    return updatedTheme || undefined;
  }
  
  async deleteColorTheme(id: number): Promise<boolean> {
    // Check if theme exists and is default
    const theme = await this.getColorThemeById(id);
    
    if (!theme) {
      return false;
    }
    
    // Don't allow deleting the default theme
    if (theme.isDefault) {
      throw new Error("Cannot delete the default color theme");
    }
    
    const [deletedTheme] = await db
      .delete(colorThemes)
      .where(eq(colorThemes.id, id))
      .returning();
    
    return !!deletedTheme;
  }
  
  async setDefaultColorTheme(id: number): Promise<ColorTheme | undefined> {
    // Check if theme exists
    const theme = await this.getColorThemeById(id);
    
    if (!theme) {
      return undefined;
    }
    
    // Set all themes to non-default
    await db
      .update(colorThemes)
      .set({ isDefault: false });
    
    // Set this theme as default
    const [updatedTheme] = await db
      .update(colorThemes)
      .set({ isDefault: true })
      .where(eq(colorThemes.id, id))
      .returning();
    
    return updatedTheme || undefined;
  }
  
  // Initialize with sample data if tables are empty
  async initializeSampleData(): Promise<void> {
    // Check if items, rooms, and color themes tables are empty
    const existingItems = await this.getItems();
    const existingRooms = await this.getRooms();
    const existingThemes = await this.getColorThemes();
    
    if (existingItems.length > 0 && existingRooms.length > 0 && existingThemes.length > 0) {
      // Tables already have data, no need to initialize
      console.log("Database already contains data, skipping initialization");
      return;
    }
    
    console.log("Initializing database with sample data...");
    
    // Initialize items first
    if (existingItems.length === 0) {
      await this.initializeItems();
    }
    
    // Then initialize rooms and assign items to them
    if (existingRooms.length === 0) {
      await this.initializeRooms();
    }
    
    // Initialize color themes
    if (existingThemes.length === 0) {
      await this.initializeColorThemes();
    }
    
    console.log("Sample data initialization complete");
  }
  
  private async initializeItems(): Promise<void> {
    // All possible items
    const allItemsData: InsertItem[] = [
      {
        name: "Golden Chalice",
        description: "Legendary artifact",
        imageUrl: "https://images.unsplash.com/photo-1592492152545-9695d3f473f4",
        rarity: "Legendary"
      },
      {
        name: "Jeweled Crown",
        description: "Royal headpiece",
        imageUrl: "https://images.unsplash.com/photo-1603036050141-c61fde866f5c",
        rarity: "Epic"
      },
      {
        name: "Ancient Scroll",
        description: "Magical knowledge",
        imageUrl: "https://images.unsplash.com/photo-1618760439048-56c6969bb3f0",
        rarity: "Rare"
      },
      {
        name: "Ruby Amulet",
        description: "Protective jewelry",
        imageUrl: "https://images.unsplash.com/photo-1655720020814-2db0c4e4d5a1",
        rarity: "Epic"
      },
      {
        name: "Enchanted Seeds",
        description: "Grow magical plants",
        imageUrl: "https://images.unsplash.com/photo-1458014854819-1a40aa70211c",
        rarity: "Rare"
      },
      {
        name: "Woodland Staff",
        description: "Controls natural forces",
        imageUrl: "https://images.unsplash.com/photo-1541675154750-0444c7d51e8e",
        rarity: "Epic"
      },
      {
        name: "Leaf Pendant",
        description: "Rejuvenating amulet",
        imageUrl: "https://images.unsplash.com/photo-1618333258404-fc2a28ea8f32",
        rarity: "Uncommon"
      },
      {
        name: "Crystal Orb",
        description: "Forest vision",
        imageUrl: "https://images.unsplash.com/photo-1519356162333-4d1a2203e303",
        rarity: "Rare"
      },
      {
        name: "Trident",
        description: "Ocean's power",
        imageUrl: "https://images.unsplash.com/photo-1597671535948-181d0bcd0dde",
        rarity: "Uncommon"
      },
      {
        name: "Pearl Necklace",
        description: "Sea treasure",
        imageUrl: "https://images.unsplash.com/photo-1601821765780-754fa98637c1",
        rarity: "Common"
      },
      {
        name: "Coral Fragment",
        description: "Underwater beauty",
        imageUrl: "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17",
        rarity: "Common"
      },
      {
        name: "Mariner's Compass",
        description: "Always finds home",
        imageUrl: "https://images.unsplash.com/photo-1560972550-aba3456e5e00",
        rarity: "Rare"
      },
      {
        name: "Arcane Tome",
        description: "Ancient knowledge",
        imageUrl: "https://images.unsplash.com/photo-1532012197267-da84d127e765",
        rarity: "Epic"
      },
      {
        name: "Quill of Binding",
        description: "Magical writing tool",
        imageUrl: "https://images.unsplash.com/photo-1585952326541-0fb3ba2bb4b7",
        rarity: "Rare"
      },
      {
        name: "Crystal Lens",
        description: "Reveals hidden text",
        imageUrl: "https://images.unsplash.com/photo-1605870445919-838d190e8e1b",
        rarity: "Uncommon"
      },
      {
        name: "Philosopher's Stone",
        description: "Alchemical marvel",
        imageUrl: "https://images.unsplash.com/photo-1514313122851-5367ff6173ac",
        rarity: "Legendary"
      },
      {
        name: "Dragon Scale",
        description: "Impervious armor material",
        imageUrl: "https://images.unsplash.com/photo-1577401239170-897942555fb3",
        rarity: "Epic"
      },
      {
        name: "Fire Opal",
        description: "Contains flame essence",
        imageUrl: "https://images.unsplash.com/photo-1598226792550-9899091f91ef",
        rarity: "Rare"
      },
      {
        name: "Obsidian Blade",
        description: "Volcanic glass dagger",
        imageUrl: "https://images.unsplash.com/photo-1589994165661-6d673e4544a9",
        rarity: "Uncommon"
      },
      {
        name: "Dragon's Tear",
        description: "Rare crystallized energy",
        imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd",
        rarity: "Legendary"
      },
      {
        name: "Gold Ingot",
        description: "Pure precious metal",
        imageUrl: "https://images.unsplash.com/photo-1610375461249-b64bf36ea3bb",
        rarity: "Common"
      },
      {
        name: "Ancient Coin",
        description: "Forgotten currency",
        imageUrl: "https://images.unsplash.com/photo-1563985336376-442544881fdc",
        rarity: "Uncommon"
      },
      {
        name: "Diamond Pendant",
        description: "Flawless gem",
        imageUrl: "https://images.unsplash.com/photo-1583937443566-6fe1a1c6e400",
        rarity: "Epic"
      },
      {
        name: "Treasure Map",
        description: "Leads to greater fortune",
        imageUrl: "https://images.unsplash.com/photo-1577543585649-aef8d6e5772f",
        rarity: "Rare"
      },
      {
        name: "Enchanted Mirror",
        description: "Shows other realms",
        imageUrl: "https://images.unsplash.com/photo-1563198396-f951d85fa323",
        rarity: "Epic"
      },
      {
        name: "Fairy Dust",
        description: "Magical essence",
        imageUrl: "https://images.unsplash.com/photo-1580196969807-cc6de282c646",
        rarity: "Rare"
      },
      {
        name: "Glowing Crystal",
        description: "Eternal light source",
        imageUrl: "https://images.unsplash.com/photo-1598861522674-a9c0a4fa1e1a",
        rarity: "Uncommon"
      },
      {
        name: "Wish Pendant",
        description: "Grants small desires",
        imageUrl: "https://images.unsplash.com/photo-1602752250015-52934bc45613",
        rarity: "Epic"
      }
    ];
    
    // Insert all items
    for (const itemData of allItemsData) {
      await this.createItem(itemData);
    }
  }
  
  private async initializeRooms(): Promise<void> {
    // Sample rooms
    const roomsData: InsertRoom[] = [
      {
        name: "Luxury Suite",
        description: "Exclusive items with exceptional rarity await in this premium room.",
        probability: 20,
        rarity: "High Rarity",
        imageUrl: "https://images.unsplash.com/photo-1618219740975-d40978bb7378",
        color: "amber",
        icon: "coins"
      },
      {
        name: "Forest Chamber",
        description: "Nature-themed items with a good balance of common and rare finds.",
        probability: 30,
        rarity: "Medium Rarity",
        imageUrl: "https://images.unsplash.com/photo-1560185007-cde436f6a4d0",
        color: "emerald",
        icon: "heart"
      },
      {
        name: "Ocean Vault",
        description: "Common ocean-themed items with occasional surprises from the deep.",
        probability: 50,
        rarity: "Common Rarity",
        imageUrl: "https://images.unsplash.com/photo-1566195992011-5f6b21e539aa",
        color: "blue",
        icon: "play"
      },
      {
        name: "Mystic Library",
        description: "Magical tomes and arcane artifacts for the scholarly adventurer.",
        probability: 15,
        rarity: "High Rarity",
        imageUrl: "https://images.unsplash.com/photo-1600431521340-491eca880813",
        color: "purple",
        icon: "bookmark"
      },
      {
        name: "Dragon's Lair",
        description: "Dangerous but rewarding room with fire-forged treasures.",
        probability: 10,
        rarity: "Very High Rarity",
        imageUrl: "https://images.unsplash.com/photo-1605806616949-11b2fabd4e2f",
        color: "red",
        icon: "flame"
      },
      {
        name: "Treasure Vault",
        description: "The rarest and most valuable items are stored in this secure vault.",
        probability: 5,
        rarity: "Legendary Rarity",
        imageUrl: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99",
        color: "yellow",
        icon: "cubes"
      },
      {
        name: "Enchanted Room",
        description: "Magical items imbued with mysterious enchantments and powers.",
        probability: 20,
        rarity: "Medium Rarity",
        imageUrl: "https://images.unsplash.com/photo-1519608487953-e999c86e7455",
        color: "pink",
        icon: "lightbulb"
      }
    ];
    
    // Insert rooms
    for (const roomData of roomsData) {
      const room = await this.createRoom(roomData);
      await this.addRoomItems(room.id, room.color);
    }
  }
  
  private async addRoomItems(roomId: number, color: string): Promise<void> {
    // Get all items
    const allItems = await this.getItems();
    
    // Filter items based on room color/theme
    const itemsForThisTheme = allItems.filter(item => {
      switch (color) {
        case "amber":
          return ["Golden Chalice", "Jeweled Crown", "Ancient Scroll", "Ruby Amulet"].includes(item.name);
        case "emerald":
          return ["Enchanted Seeds", "Woodland Staff", "Leaf Pendant", "Crystal Orb"].includes(item.name);
        case "blue":
          return ["Trident", "Pearl Necklace", "Coral Fragment", "Mariner's Compass"].includes(item.name);
        case "purple":
          return ["Arcane Tome", "Quill of Binding", "Crystal Lens", "Philosopher's Stone"].includes(item.name);
        case "red":
          return ["Dragon Scale", "Fire Opal", "Obsidian Blade", "Dragon's Tear"].includes(item.name);
        case "yellow":
          return ["Gold Ingot", "Ancient Coin", "Diamond Pendant", "Treasure Map"].includes(item.name);
        case "pink":
          return ["Enchanted Mirror", "Fairy Dust", "Glowing Crystal", "Wish Pendant"].includes(item.name);
        default:
          return false;
      }
    });
    
    // Assign items to the room with random probabilities
    for (const item of itemsForThisTheme) {
      const probability = Math.floor(Math.random() * 50) + 50; // 50-100
      const canRepeat = Math.random() > 0.5; // 50% chance of being repeatable
      
      await this.assignItemToRoom(roomId, item.id, { probability, canRepeat });
    }
  }
  
  private async initializeColorThemes(): Promise<void> {
    // Sample color themes
    const themesData: InsertColorTheme[] = [
      {
        name: "Dark Mode",
        description: "Dark theme with blue accents",
        primaryColor: "#3B82F6",    // Blue
        secondaryColor: "#1E40AF",  // Darker blue
        accentColor: "#F59E0B",     // Amber
        backgroundColor: "#1F2937", // Dark gray
        textColor: "#F9FAFB",       // White
        isDefault: true
      },
      {
        name: "Light Mode",
        description: "Light theme with purple accents",
        primaryColor: "#8B5CF6",    // Purple
        secondaryColor: "#6D28D9",  // Darker purple
        accentColor: "#10B981",     // Emerald
        backgroundColor: "#F9FAFB", // White
        textColor: "#111827",       // Black
        isDefault: false
      },
      {
        name: "Sunset",
        description: "Warm oranges and reds",
        primaryColor: "#F97316",    // Orange
        secondaryColor: "#C2410C",  // Dark orange
        accentColor: "#EF4444",     // Red
        backgroundColor: "#FFFBEB", // Light yellow
        textColor: "#7C2D12",       // Brown
        isDefault: false
      }
    ];
    
    // Insert all color themes
    for (const themeData of themesData) {
      await this.createColorTheme(themeData);
    }
  }
}