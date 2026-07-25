import { axiosInstance } from "@/app/lib/axiosInstance";

export const userApi = {
  getCurrent: async () => {
    const { data } = await axiosInstance.get<{
      id: string;
      role: string;
      fullName: string;
      createdAt: string;
      updatedAt: string;
    }>("/api/user");
    return data;
  },

  getByEmail: async (email: string) => {
    const { data } = await axiosInstance.get<{ exist: boolean }>(
      `/api/user/${encodeURIComponent(email)}`,
    );
    return data;
  },

  create: async (payload: {
    email: string;
    fullName: string;
    role?: string;
  }) => {
    const { data } = await axiosInstance.post<{ message: string }>(
      "/api/user",
      payload,
    );
    return data;
  },

  delete: async () => {
    await axiosInstance.delete("/api/user");
  },
};

export const authApi = {
  googleCallback: async (code: string, businessName: string) => {
    const authService = process.env.NEXT_PUBLIC_AUTH_URL;
    if (!authService) {
      throw new Error("NEXT_PUBLIC_AUTH_URL environment variable is not set");
    }

    const { data } = await axiosInstance.get<{
      userInfo: {
        profileImage: string | null;
        username: string;
        name: string;
        email: string;
      };
    }>(`${authService}/auth/google/callback`, {
      params: { code, businessName },
    });

    return data;
  },

  logout: async () => {
    const authService = process.env.NEXT_PUBLIC_AUTH_URL;
    if (!authService) {
      throw new Error("NEXT_PUBLIC_AUTH_URL environment variable is not set");
    }
    await axiosInstance.post(`${authService}/users/logout`);
  },
};
