

export function login(userId) {
    const user = userDatabase[userId];
    if (!user) throw new Error("User not found!");
    return jwt.sign({ userId, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "10m" });
}