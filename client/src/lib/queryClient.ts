import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  urlOrConfig: string | { url: string; method?: string; body?: any },
  config?: RequestInit
): Promise<any> {
  let url: string;
  let requestConfig: RequestInit = config || {};

  if (typeof urlOrConfig === 'string') {
    url = urlOrConfig;
  } else {
    url = urlOrConfig.url;
    requestConfig.method = urlOrConfig.method || 'GET';
    if (urlOrConfig.body !== undefined) {
      requestConfig.body = typeof urlOrConfig.body === 'string' 
        ? urlOrConfig.body 
        : JSON.stringify(urlOrConfig.body);
      
      // Set content-type header for JSON bodies if not already set
      if (!requestConfig.headers) {
        requestConfig.headers = {
          'Content-Type': 'application/json'
        };
      }
    }
  }

  const res = await fetch(url, {
    ...requestConfig,
    credentials: 'include',
  });

  await throwIfResNotOk(res);
  
  // Try to parse response as JSON, fallback to text or null
  try {
    return await res.json();
  } catch (e) {
    try {
      const text = await res.text();
      return text.length > 0 ? text : null;
    } catch (e) {
      return null;
    }
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
