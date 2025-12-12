import { db } from '../firebase';

interface UserData {
    telegramId: number;
    phoneNumber: string;
    firstName: string;
    lastName?: string;
    username?: string;
    registeredAt: Date;
    balance: number;
}

class UserService {
    // ... (keep private properties)
    private users: Map<number, UserData> = new Map();
    private useFirebase: boolean = false;

    constructor() {
        // ... (keep constructor)
        // Check if Firebase is available
        try {
            if (db) {
                this.useFirebase = true;
                console.log('✅ UserService: Using Firebase for storage');
            } else {
                console.log('⚠️  UserService: Using in-memory storage (Firebase not configured or db is null)');
            }
        } catch (error) {
            console.log('⚠️  UserService: Using in-memory storage (Firebase not configured)');
        }
    }

    async registerUser(data: {
        telegramId: number;
        phoneNumber: string;
        firstName: string;
        lastName?: string;
        username?: string;
    }): Promise<UserData> {
        // Check if already registered
        if (await this.isRegistered(data.telegramId)) {
            throw new Error('User already registered');
        }

        const newUser: UserData = {
            telegramId: data.telegramId,
            phoneNumber: data.phoneNumber,
            firstName: data.firstName,
            lastName: data.lastName,
            username: data.username,
            registeredAt: new Date(),
            balance: 100 // Welcome bonus
        };

        // Store in memory
        this.users.set(data.telegramId, newUser);

        // Store in Firebase
        if (this.useFirebase && db) {
            try {
                const firebaseData: any = {
                    ...newUser,
                    registeredAt: newUser.registeredAt.toISOString()
                };
                // Cleanup undefined
                Object.keys(firebaseData).forEach(key => firebaseData[key] === undefined && delete firebaseData[key]);

                await db.collection('users').doc(data.telegramId.toString()).set(firebaseData);
                console.log(`✅ User registered in Firebase`);
            } catch (error) {
                console.error('Firebase registration error:', error);
            }
        }

        return newUser;
    }



    // ... (rest of methods: getUser, isRegistered, updateBalance, getAllUsers)

    async getUser(telegramId: number): Promise<UserData | null> {
        // Check memory first
        let user = this.users.get(telegramId);

        // If not in memory and Firebase is available, check Firebase
        if (!user && this.useFirebase && db) {
            try {
                const doc = await db.collection('users').doc(telegramId.toString()).get();
                if (doc.exists) {
                    const data = doc.data();
                    user = {
                        ...data,
                        registeredAt: new Date(data!.registeredAt)
                    } as UserData;
                }
            } catch (error) {
                console.error('Firebase get user error:', error);
            }
        }

        if (user) {
            // Cache in memory if found (and not just updated)
            this.users.set(telegramId, user);
        }

        return user || null;
    }

    async isRegistered(telegramId: number): Promise<boolean> {
        // ... (keep existing implementation)
        // Check memory first
        if (this.users.has(telegramId)) {
            return true;
        }

        // Check Firebase if available
        if (this.useFirebase && db) {
            try {
                const doc = await db.collection('users').doc(telegramId.toString()).get();
                if (doc.exists) {
                    // Cache in memory
                    const data = doc.data();
                    const user = {
                        ...data,
                        registeredAt: new Date(data!.registeredAt)
                    } as UserData;
                    this.users.set(telegramId, user);
                    return true;
                }
            } catch (error) {
                console.error('Firebase check registration error:', error);
            }
        }

        return false;
    }

    async updateBalance(telegramId: number, amount: number): Promise<number> {
        // ... (keep existing implementation)
        const user = await this.getUser(telegramId);
        if (!user) throw new Error('User not found');

        user.balance += amount;
        this.users.set(telegramId, user);

        // Update in Firebase if available
        if (this.useFirebase && db) {
            try {
                await db.collection('users').doc(telegramId.toString()).update({
                    balance: user.balance
                });
            } catch (error) {
                console.error('Firebase update balance error:', error);
            }
        }

        return user.balance;
    }



    async getAllUsers(): Promise<UserData[]> {
        return Array.from(this.users.values());
    }
}

export const userService = new UserService();
export type { UserData };
