import { 
  users, type User, type InsertUser,
  rooms, type Room, type InsertRoom,
  items, type Item, type InsertItem,
  roomItems, type RoomItem, type InsertRoomItem,
  colorThemes, type ColorTheme, type InsertColorTheme,
  type RoomItemWithDetails
} from "@shared/schema";
import { DatabaseStorage } from "./storage.database";
import * as ColorThemeStorage from "./storage.colorthemes";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Room methods
  getRooms(): Promise<Room[]>;
  getRoomById(id: number): Promise<Room | undefined>;
  getRandomRooms(count: number): Promise<Room[]>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room | undefined>;
  deleteRoom(id: number): Promise<boolean>;
  
  // Item storage methods (global items)
  getItems(): Promise<Item[]>;
  getItemById(id: number): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: number, item: Partial<InsertItem>): Promise<Item | undefined>;
  deleteItem(id: number): Promise<boolean>;
  
  // Room Items methods (item assignments to rooms)
  getRoomItemsWithDetails(roomId: number): Promise<RoomItemWithDetails[]>;
  getRandomRoomItemsWithDetails(roomId: number, count: number): Promise<RoomItemWithDetails[]>;
  getGuaranteedRoomItemsWithDetails(roomId: number): Promise<RoomItemWithDetails[]>;
  assignItemToRoom(roomId: number, itemId: number, properties: { probability?: number; canRepeat?: boolean; maxRepeats?: number; isGuaranteed?: boolean }): Promise<RoomItem>;
  updateRoomItemAssignment(id: number, properties: { probability?: number; canRepeat?: boolean; maxRepeats?: number; isGuaranteed?: boolean }): Promise<RoomItem | undefined>;
  removeItemFromRoom(roomItemId: number): Promise<boolean>;
  
  // Color Theme methods
  getColorThemes(): Promise<ColorTheme[]>;
  getColorThemeById(id: number): Promise<ColorTheme | undefined>;
  getDefaultColorTheme(): Promise<ColorTheme | undefined>;
  createColorTheme(theme: InsertColorTheme): Promise<ColorTheme>;
  updateColorTheme(id: number, theme: Partial<InsertColorTheme>): Promise<ColorTheme | undefined>;
  deleteColorTheme(id: number): Promise<boolean>;
  setDefaultColorTheme(id: number): Promise<ColorTheme | undefined>;
}
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private rooms: Map<number, Room>;
  private items: Map<number, Item>;
  private roomItems: Map<number, RoomItem>;
  private colorThemes: Map<number, ColorTheme>;
  private userId: number;
  private roomId: number;
  private itemId: number;
  private roomItemId: number;
  private colorThemeId: number;

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.items = new Map();
    this.roomItems = new Map();
    this.colorThemes = new Map();
    this.userId = 1;
    this.roomId = 1;
    this.itemId = 1;
    this.roomItemId = 1;
    this.colorThemeId = 1;
    
    // Initialize with sample data
    this.initItems();
    this.initRooms();
    this.initColorThemes();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async getRooms(): Promise<Room[]> {
    return Array.from(this.rooms.values());
  }
  
  async getRoomById(id: number): Promise<Room | undefined> {
    return this.rooms.get(id);
  }
  
  async getRandomRooms(count: number): Promise<Room[]> {
    const allRooms = await this.getRooms();
    
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
    
    // If we don't have enough unique rooms, add more randomly
    if (selectedRooms.length < count) {
      for (const room of allRooms) {
        if (selectedIds.has(room.id)) continue;
        
        selectedRooms.push(room);
        selectedIds.add(room.id);
        
        if (selectedRooms.length === count) break;
      }
    }
    
    return selectedRooms;
  }
  
  async getRoomItems(roomId: number): Promise<RoomItem[]> {
    return Array.from(this.roomItems.values()).filter(
      (item) => item.roomId === roomId,
    );
  }
  
  async createRoom(room: InsertRoom): Promise<Room> {
    const id = this.roomId++;
    const newRoom: Room = { 
      ...room, 
      id,
      itemsToShow: room.itemsToShow || 3,
      interiorImageUrl: room.interiorImageUrl || null,
      randomizeRepeats: room.randomizeRepeats !== undefined ? room.randomizeRepeats : true
    };
    this.rooms.set(id, newRoom);
    
    // If items exist for this room, we add them
    if (room.color) {
      this.addRoomItems(id, room.color);
    }
    
    return newRoom;
  }
  
  async updateRoom(id: number, roomUpdate: Partial<InsertRoom>): Promise<Room | undefined> {
    const room = this.rooms.get(id);
    
    if (!room) {
      return undefined;
    }
    
    const updatedRoom: Room = { ...room, ...roomUpdate };
    this.rooms.set(id, updatedRoom);
    
    return updatedRoom;
  }
  
  async deleteRoom(id: number): Promise<boolean> {
    if (!this.rooms.has(id)) {
      return false;
    }
    
    // Delete the room
    this.rooms.delete(id);
    
    // Delete all items associated with this room
    const itemsToDelete = Array.from(this.roomItems.values())
      .filter(item => item.roomId === id)
      .map(item => item.id);
    
    for (const itemId of itemsToDelete) {
      this.roomItems.delete(itemId);
    }
    
    return true;
  }
  
  async createRoomItem(item: InsertRoomItem): Promise<RoomItem> {
    const id = this.roomItemId++;
    const newItem: RoomItem = { 
      ...item, 
      id,
      probability: item.probability || 100,
      canRepeat: item.canRepeat !== undefined ? item.canRepeat : true,
      maxRepeats: item.maxRepeats !== undefined ? item.maxRepeats : 1,
      isGuaranteed: item.isGuaranteed !== undefined ? item.isGuaranteed : false
    };
    this.roomItems.set(id, newItem);
    return newItem;
  }
  
  async updateRoomItem(id: number, itemUpdate: Partial<InsertRoomItem>): Promise<RoomItem | undefined> {
    const item = this.roomItems.get(id);
    
    if (!item) {
      return undefined;
    }
    
    const updatedItem: RoomItem = { ...item, ...itemUpdate };
    this.roomItems.set(id, updatedItem);
    
    return updatedItem;
  }
  
  async deleteRoomItem(id: number): Promise<boolean> {
    return this.roomItems.delete(id);
  }

  // Item Storage Methods
  async getItems(): Promise<Item[]> {
    return Array.from(this.items.values());
  }
  
  async getItemById(id: number): Promise<Item | undefined> {
    return this.items.get(id);
  }
  
  async createItem(item: InsertItem): Promise<Item> {
    const id = this.itemId++;
    // Ensure description is at least null if not provided
    const itemWithNullDesc = { 
      ...item, 
      description: item.description ?? null
    };
    const newItem: Item = { ...itemWithNullDesc, id };
    this.items.set(id, newItem);
    return newItem;
  }
  
  async updateItem(id: number, itemUpdate: Partial<InsertItem>): Promise<Item | undefined> {
    const item = this.items.get(id);
    
    if (!item) {
      return undefined;
    }
    
    const updatedItem: Item = { ...item, ...itemUpdate };
    this.items.set(id, updatedItem);
    
    return updatedItem;
  }
  
  async deleteItem(id: number): Promise<boolean> {
    if (!this.items.has(id)) {
      return false;
    }
    
    // Delete the item
    this.items.delete(id);
    
    // Delete all room-item assignments for this item
    const assignments = Array.from(this.roomItems.values())
      .filter(roomItem => roomItem.itemId === id)
      .map(roomItem => roomItem.id);
    
    for (const assignmentId of assignments) {
      this.roomItems.delete(assignmentId);
    }
    
    return true;
  }
  
  // Room Item Assignment Methods
  async getRoomItemsWithDetails(roomId: number): Promise<RoomItemWithDetails[]> {
    const roomItems = await this.getRoomItems(roomId);
    const result: RoomItemWithDetails[] = [];
    
    for (const roomItem of roomItems) {
      const item = this.items.get(roomItem.itemId);
      if (item) {
        result.push({
          ...roomItem,
          item,
        });
      }
    }
    
    return result;
  }
  
  async getGuaranteedRoomItemsWithDetails(roomId: number): Promise<RoomItemWithDetails[]> {
    const allRoomItems = await this.getRoomItemsWithDetails(roomId);
    
    // Retorna apenas os itens marcados como garantidos
    return allRoomItems.filter(item => item.isGuaranteed);
  }
  
  async getRandomRoomItemsWithDetails(roomId: number, count: number): Promise<RoomItemWithDetails[]> {
    // Get room to check if randomizeRepeats is enabled
    const room = await this.getRoomById(roomId);
    if (!room) {
      throw new Error(`Room with ID ${roomId} not found`);
    }
    
    // Primeiro, obtemos todos os itens da sala
    const allRoomItems = await this.getRoomItemsWithDetails(roomId);
    
    // Separamos os itens garantidos dos itens aleatórios
    const guaranteedItems = allRoomItems.filter(item => item.isGuaranteed);
    const randomItems = allRoomItems.filter(item => !item.isGuaranteed);
    
    // Se o número de itens garantidos for maior ou igual ao que precisamos mostrar,
    // retornamos apenas os itens garantidos (até o limite de count)
    if (guaranteedItems.length >= count) {
      return guaranteedItems.slice(0, count);
    }
    
    // Caso contrário, incluímos todos os itens garantidos e completamos com itens aleatórios
    let remainingCount = count - guaranteedItems.length;
    let result = [...guaranteedItems];
    
    // Se não há itens aleatórios ou não precisamos mais de itens, retorna o que temos
    if (randomItems.length === 0 || remainingCount <= 0) {
      return result;
    }
    
    // Se o número de itens aleatórios é menor ou igual ao que precisamos, pegamos todos
    if (randomItems.length <= remainingCount) {
      return [...result, ...randomItems];
    }
    
    // Create a pool of items based on their probability
    let itemPool: RoomItemWithDetails[] = [];
    
    // For each item, add it to the pool based on its probability
    randomItems.forEach(roomItem => {
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
    
    // Track how many times each item has been selected
    const itemRepeatCounts = new Map<number, number>();
    const randomResults: RoomItemWithDetails[] = [];
    
    // Keep picking items until we have enough or run out of options
    while (randomResults.length < remainingCount && itemPool.length > 0) {
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
      randomResults.push(roomItem);
      
      // Update repeat count for this item
      itemRepeatCounts.set(roomItem.itemId, currentRepeatCount + 1);
      
      // If the room has randomizeRepeats enabled and this item can repeat,
      // and it hasn't reached its max repeats, add it back to the pool
      if (room.randomizeRepeats && roomItem.canRepeat && 
          currentRepeatCount + 1 < (roomItem.maxRepeats || 1) && 
          randomResults.length < remainingCount) {
        itemPool.push(roomItem);
      }
    }
    
    // Combinamos os itens garantidos com os itens aleatórios selecionados
    return [...result, ...randomResults];
  }
  
  async assignItemToRoom(roomId: number, itemId: number, properties: { probability?: number; canRepeat?: boolean; maxRepeats?: number; isGuaranteed?: boolean }): Promise<RoomItem> {
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
      isGuaranteed: properties.isGuaranteed !== undefined ? properties.isGuaranteed : false,
    };
    
    // Save the assignment
    return this.createRoomItem(assignment);
  }
  
  async updateRoomItemAssignment(id: number, properties: { probability?: number; canRepeat?: boolean; maxRepeats?: number; isGuaranteed?: boolean }): Promise<RoomItem | undefined> {
    return this.updateRoomItem(id, properties);
  }
  
  async removeItemFromRoom(roomItemId: number): Promise<boolean> {
    return this.deleteRoomItem(roomItemId);
  }
  
  // Color Theme methods
  async getColorThemes(): Promise<ColorTheme[]> {
    return ColorThemeStorage.getColorThemes(this.colorThemes);
  }
  
  async getColorThemeById(id: number): Promise<ColorTheme | undefined> {
    return ColorThemeStorage.getColorThemeById(this.colorThemes, id);
  }
  
  async getDefaultColorTheme(): Promise<ColorTheme | undefined> {
    return ColorThemeStorage.getDefaultColorTheme(this.colorThemes);
  }
  
  async createColorTheme(theme: InsertColorTheme): Promise<ColorTheme> {
    const newTheme = await ColorThemeStorage.createColorTheme(this.colorThemes, theme, this.colorThemeId);
    this.colorThemeId++;
    return newTheme;
  }
  
  async updateColorTheme(id: number, theme: Partial<InsertColorTheme>): Promise<ColorTheme | undefined> {
    return ColorThemeStorage.updateColorTheme(this.colorThemes, id, theme);
  }
  
  async deleteColorTheme(id: number): Promise<boolean> {
    return ColorThemeStorage.deleteColorTheme(this.colorThemes, id);
  }
  
  async setDefaultColorTheme(id: number): Promise<ColorTheme | undefined> {
    return ColorThemeStorage.setDefaultColorTheme(this.colorThemes, id);
  }
  
  private initColorThemes() {
    this.colorThemeId = ColorThemeStorage.initializeColorThemes(this.colorThemes, this.colorThemeId);
  }
  
  // Helper methods for initializing data
  private initRooms() {
    // Add rooms
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
    
    roomsData.forEach(roomData => {
      const id = this.roomId++;
      const room: Room = { 
        ...roomData, 
        id,
        itemsToShow: roomData.itemsToShow || 3,
        interiorImageUrl: roomData.interiorImageUrl || null,
        randomizeRepeats: roomData.randomizeRepeats !== undefined ? roomData.randomizeRepeats : true
      };
      this.rooms.set(id, room);
      
      // Add items for each room
      this.addRoomItems(id, roomData.color);
    });
  }
  
  private addRoomItems(roomId: number, color: string) {
    // Create global items if they don't exist
    this.initItems();
    
    // Get items appropriate for this room's theme (by color)
    const itemsForThisTheme = Array.from(this.items.values()).filter(item => {
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
      
      // Create room-item assignment
      const id = this.roomItemId++;
      const roomItem: RoomItem = { 
        id, 
        roomId, 
        itemId: item.id,
        probability,
        canRepeat,
        maxRepeats: 1,
        isGuaranteed: false
      };
      this.roomItems.set(id, roomItem);
    }
  }
  
  // Initialize the global item storage
  private initItems() {
    // Skip if items are already initialized
    if (this.items.size > 0) return;
    
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
    
    // Add all items to the global storage
    for (const itemData of allItemsData) {
      const id = this.itemId++;
      // Ensure description is at least null if not provided
      const itemWithNullDesc = { 
        ...itemData, 
        description: itemData.description ?? null
      };
      const item: Item = { ...itemWithNullDesc, id };
      this.items.set(id, item);
    }
  }
}

// Use DatabaseStorage for production, MemStorage for tests
const isTest = process.env.NODE_ENV === 'test';
export const storage = isTest ? new MemStorage() : new DatabaseStorage();
