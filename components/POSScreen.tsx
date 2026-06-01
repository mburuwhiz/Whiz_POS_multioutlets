import React, { useMemo, useState } from 'react';
import { usePosStore } from '../store/posStore';
import { Search, Plus, Minus, ShoppingCart, X, Package, Pause, RotateCcw, Monitor, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import CheckoutModal from './CheckoutModal';
import { useToast } from './ui/use-toast';
import defaultProductImage from '../assets/cart.png';

export default function POSScreen() {
  const { toast } = useToast();
  const {
    products,
    cart,
    businessSetup,
    heldOrders,
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    openCheckout,
    categories,
    holdCurrentOrder,
    retrieveHeldOrder,
    deleteHeldOrder,
    setCartItemModifier
  } = usePosStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showHeld, setShowHeld] = useState(false);
  const [showCustomerDisplay, setShowCustomerDisplay] = useState(true);
  const [modifierProductId, setModifierProductId] = useState<number | null>(null);
  const [modifierText, setModifierText] = useState('');

  const assignedIds = businessSetup?.assignedProductIds;
  const outletProducts = useMemo(() => {
    if (!assignedIds?.length) return products;
    const idSet = new Set(assignedIds.map(String));
    return products.filter(p => idSet.has(String(p.id)));
  }, [products, assignedIds]);

  const filteredProducts = outletProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const applyModifier = () => {
    if (modifierProductId != null && modifierText.trim()) {
      setCartItemModifier(modifierProductId, modifierText.trim());
      setModifierProductId(null);
      setModifierText('');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      {showCustomerDisplay && cart.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-2 flex justify-between items-center shadow-lg">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Customer display</p>
            <p className="text-lg font-bold">{cartItemCount} item{cartItemCount !== 1 ? 's' : ''}</p>
          </div>
          <p className="text-2xl font-black text-emerald-400">KES {cartTotal.toFixed(2)}</p>
          <button onClick={() => setShowCustomerDisplay(false)} className="text-slate-400 hover:text-white">
            <Monitor className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col p-2 md:p-4">
          <div className="bg-white rounded-xl p-3 mb-3 shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-sm h-9"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => holdCurrentOrder()} disabled={cart.length === 0} className="h-9 px-3">
                  <Pause className="w-4 h-4 mr-1.5" /> Hold
                </Button>
                <Button variant="ghost" onClick={() => setShowHeld(!showHeld)} className="h-9 px-3">
                  <RotateCcw className="w-4 h-4 mr-1.5" /> Held ({heldOrders.length})
                </Button>
                {!showCustomerDisplay && (
                  <Button variant="ghost" onClick={() => setShowCustomerDisplay(true)} className="h-9 w-9 p-0">
                    <Monitor className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 mt-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-semibold ${
                  !selectedCategory ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-semibold ${
                    selectedCategory === category ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {showHeld && heldOrders.length > 0 && (
            <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="font-semibold text-amber-900 mb-2 text-sm">Held orders</p>
              <div className="flex flex-wrap gap-2">
                {heldOrders.map(order => (
                  <div key={order.id} className="flex gap-2 items-center bg-white rounded-lg px-3 py-2 border">
                    <span className="text-sm font-medium">{order.label}</span>
                    <Button size="sm" onClick={() => retrieveHeldOrder(order.id)}>Retrieve</Button>
                    <button onClick={() => deleteHeldOrder(order.id)} className="text-red-500 text-sm">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Package className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-slate-600">No Products Found</h3>
                  {assignedIds?.length ? (
                    <p className="text-slate-500 mt-1 text-sm">Only server-assigned products appear at this outlet.</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
                {filteredProducts.map((product) => {
                  const cartItem = cart.find((item) => item.product.id === product.id);
                  const isOutOfStock = product.stock <= 0;
                  
                  const handleClick = () => {
                    if (isOutOfStock) {
                      toast("Out of Stock", "error");
                      return;
                    }
                    addToCart(product);
                  };
                  
                  return (
                    <div
                      key={product.id}
                      onClick={handleClick}
                      className={`bg-white rounded-lg p-2 shadow-sm border hover:shadow cursor-pointer ${
                        isOutOfStock ? "border-red-200 bg-red-50 opacity-70" : "border-slate-200"
                      }`}
                    >
                      <div className="aspect-square bg-slate-50 rounded-md mb-1.5 flex items-center justify-center overflow-hidden relative">
                        <img src={product.image || defaultProductImage} alt={product.name} className="w-full h-full object-contain p-1.5" />
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-md">
                            <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />
                              Out of Stock
                            </div>
                          </div>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-[11px] line-clamp-2 leading-tight">{product.name}</h3>
                      <p className={`font-bold text-sm mt-0.5 ${isOutOfStock ? "text-red-500" : "text-emerald-600"}`}>
                        KES {product.price.toFixed(2)}
                      </p>
                      <p className="text-slate-500 text-[10px] mt-0.5">
                        Stock: {product.stock}
                      </p>
                      {cartItem && (
                        <div className="mt-1.5 flex items-center justify-between bg-emerald-50 rounded-lg p-1.5 border border-emerald-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (cartItem.quantity > 1) updateCartItemQuantity(product.id, cartItem.quantity - 1);
                              else removeFromCart(product.id);
                            }}
                            className="h-6 w-6 bg-white rounded-md flex items-center justify-center"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="font-bold text-xs">{cartItem.quantity}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (cartItem.quantity < product.stock || product.stock <= 0) {
                                updateCartItemQuantity(product.id, cartItem.quantity + 1);
                              } else {
                                toast("Not enough stock available", "error");
                              }
                            }}
                            className="h-6 w-6 bg-emerald-600 rounded-md flex items-center justify-center text-white"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="w-96 md:w-[420px] bg-white border-l border-slate-200 flex flex-col shadow-xl">
          <div className="p-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-emerald-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Current Order</h2>
                <p className="text-xs text-slate-500">{cart.length} line{cart.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <ShoppingCart className="w-12 h-12 text-slate-200 mb-2" />
                <h3 className="text-sm font-semibold text-slate-600">Cart is Empty</h3>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.product.id} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 text-xs line-clamp-2">{item.product.name}</h4>
                        {item.modifier && <p className="text-[10px] text-blue-600 mt-0.5">{item.modifier}</p>}
                        <p className="text-emerald-600 font-bold text-xs mt-0.5">KES {item.product.price.toFixed(2)}</p>
                        <button
                          className="text-[10px] text-blue-600 mt-0.5 underline"
                          onClick={() => {
                            setModifierProductId(item.product.id);
                            setModifierText(item.modifier || '');
                          }}
                        >
                          {item.modifier ? 'Edit note' : 'Add modifier'}
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-slate-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            if (item.quantity > 1) updateCartItemQuantity(item.product.id, item.quantity - 1);
                            else removeFromCart(item.product.id);
                          }}
                          className="h-6.5 w-6.5 bg-white rounded-md border flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-bold text-xs">{item.quantity}</span>
                        <button
                          onClick={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                          className="h-6.5 w-6.5 bg-emerald-600 rounded-md flex items-center justify-center text-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-bold text-sm">KES {(item.product.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {modifierProductId != null && (
            <div className="p-3 border-t bg-blue-50">
              <Input value={modifierText} onChange={e => setModifierText(e.target.value)} placeholder="e.g. No ice, extra spicy" className="text-sm h-9" />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={applyModifier} className="h-8">Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setModifierProductId(null)} className="h-8">Cancel</Button>
              </div>
            </div>
          )}

          <div className="p-3 border-t border-slate-200 bg-slate-50">
            <div className="flex justify-between text-xl font-bold mb-3">
              <span>Total</span>
              <span className="text-emerald-600">KES {cartTotal.toFixed(2)}</span>
            </div>
            <Button
              className="w-full py-4 text-base font-bold bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              disabled={cart.length === 0}
              onClick={openCheckout}
            >
              Checkout
            </Button>
          </div>
        </div>
      </div>

      <CheckoutModal />
    </div>
  );
}
