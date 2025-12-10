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
    private users: Map<number, UserData> = new Map();

    async registerUser(data: {
        telegramId: number;
        phoneNumber: string;
        firstName: string;
        lastName?: string;
        username?: string;
    }): Promise<UserData> {
        const user: UserData = {
            ...data,
            registeredAt: new Date(),
            balance: 100 // Welcome bonus
        };

        this.users.set(data.telegramId, user);
        console.log(`✅ User registered: ${data.firstName} (${data.telegramId})`);
        return user;
    }

    async getUser(telegramId: number): Promise<UserData | null> {
        return this.users.get(telegramId) || null;
    }

    async isRegistered(telegramId: number): Promise<boolean> {
        return this.users.has(telegramId);
    }

    async updateBalance(telegramId: number, amount: number): Promise<number> {
        const user = this.users.get(telegramId);
        if (!user) throw new Error('User not found');

        user.balance += amount;
        return user.balance;
    }

    async getAllUsers(): Promise<UserData[]> {
        return Array.from(this.users.values());
    }
}

export const userService = new UserService();
export type { UserData };
