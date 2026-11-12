import { auth } from "../firebase";

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("লগইন সেশন পাওয়া যায়নি। আবার লগইন করুন।");
  }

  const idToken = await currentUser.getIdToken();

  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
      ...(options.headers || {}),
    },
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }

  return data as T;
}
