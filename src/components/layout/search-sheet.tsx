
'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useDebounce } from 'use-debounce';
import { Search, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getProductsForSearch, type SearchProduct } from "@/app/actions";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";

export function SearchSheet() {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
    const router = useRouter();

    const [allProducts, setAllProducts] = useState<SearchProduct[]>([]);
    const [suggestions, setSuggestions] = useState<SearchProduct[]>([]);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
            closeAndResetSearch();
        }
    }

    const closeAndResetSearch = () => {
        setIsSearchOpen(false);
        setSearchQuery('');
        setSuggestions([]);
    }
    
    const handleSuggestionClick = (productId: string) => {
        router.push(`/products/${productId}`);
        closeAndResetSearch();
    };

    // Effect to fetch all products for searching
    useEffect(() => {
        if (isSearchOpen && allProducts.length === 0) {
        setIsFetchingSuggestions(true);
        getProductsForSearch().then(products => {
            setAllProducts(products);
            setIsFetchingSuggestions(false);
        });
        }
    }, [isSearchOpen, allProducts.length]);

    // Effect to filter products based on debounced search query
    useEffect(() => {
        if (debouncedSearchQuery) {
        const lowercasedQuery = debouncedSearchQuery.toLowerCase();
        const filtered = allProducts.filter(product => 
            product.name.toLowerCase().includes(lowercasedQuery) ||
            product.category.toLowerCase().includes(lowercasedQuery)
        );
        setSuggestions(filtered);
        } else {
        setSuggestions([]);
        }
    }, [debouncedSearchQuery, allProducts]);

    return (
        <Sheet open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Search className="h-5 w-5" />
                    <span className="sr-only">Search</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="top" className="p-0">
                <div className="container mx-auto max-w-7xl">
                    <form onSubmit={handleSearchSubmit} className="p-4 border-b">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                                placeholder="Search for products..." 
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </form>
                    {searchQuery && (
                        <div className="bg-background">
                            <ScrollArea className="max-h-[50vh]">
                                {isFetchingSuggestions && (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                                    Loading...
                                </div>
                                )}
                                {!isFetchingSuggestions && suggestions.length > 0 && (
                                <div className="flex flex-col">
                                    {suggestions.map(product => (
                                    <div 
                                        key={product.id}
                                        onClick={() => handleSuggestionClick(product.id)}
                                        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer"
                                    >
                                        <Image src={product.image.url} alt={product.name} width={40} height={50} className="rounded-md object-cover" />
                                        <div className="flex flex-col">
                                            <p className="font-semibold text-sm">{product.name}</p>
                                            <p className="text-xs text-muted-foreground">{product.category}</p>
                                        </div>
                                    </div>
                                    ))}
                                </div>
                                )}
                                {!isFetchingSuggestions && debouncedSearchQuery && suggestions.length === 0 && (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No results found for &quot;{debouncedSearchQuery}&quot;
                                </div>
                                )}
                            </ScrollArea>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

