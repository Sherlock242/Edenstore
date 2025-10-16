'use client';

import { useState, useEffect, useCallback } from "react";
import { useDebounce } from 'use-debounce';
import { Search, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type SearchProduct } from "@/app/actions";
import { getProductsForSearchClient } from "@/app/server-actions";
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
            getProductsForSearchClient().then(products => {
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
            <SheetContent side="top" className="p-0 bg-black/80 backdrop-blur-sm border-0">
                <div className="container mx-auto max-w-7xl">
                    <div className="flex items-center gap-4 p-4">
                        <form onSubmit={handleSearchSubmit} className="flex-grow">
                            <div className="relative flex items-center">
                                <Search className="absolute left-3 h-5 w-5 text-white" />
                                <Input 
                                    placeholder="Search" 
                                    className="pl-10 h-10 bg-transparent border-white text-white placeholder:text-neutral-300 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </form>
                         <Button variant="ghost" size="icon" onClick={closeAndResetSearch} className="text-white hover:bg-neutral-700 hover:text-white">
                            <X className="h-6 w-6" />
                            <span className="sr-only">Close search</span>
                        </Button>
                    </div>
                    {searchQuery && (
                        <div className="bg-black text-white">
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
                                        className="flex items-center gap-4 p-3 hover:bg-neutral-800 cursor-pointer"
                                    >
                                        <Image src={product.image.url} alt={product.name} width={40} height={50} className="rounded-md object-cover" data-ai-hint={product.image.hint} />
                                        <div className="flex flex-col">
                                            <p className="font-semibold text-sm">{product.name}</p>
                                            <p className="text-xs text-neutral-400">{product.category}</p>
                                        </div>
                                    </div>
                                    ))}
                                </div>
                                )}
                                {!isFetchingSuggestions && debouncedSearchQuery && suggestions.length === 0 && (
                                <div className="p-4 text-center text-sm text-neutral-400">
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
