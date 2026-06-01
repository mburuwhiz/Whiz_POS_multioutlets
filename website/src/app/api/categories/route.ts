import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import { getBusinessSessionCookie } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const sessionCookie = getBusinessSessionCookie();
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie, 'base64').toString());
    } catch (e) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const categories = await Category.find({ businessId: sessionData.businessId }).sort({ createdAt: -1 });
    return NextResponse.json(categories, { status: 200 });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const sessionCookie = getBusinessSessionCookie();
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie, 'base64').toString());
    } catch (e) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const data = await request.json();
    
    const category = new Category({
      businessId: sessionData.businessId,
      name: data.name,
      description: data.description || '',
      color: data.color || '#3B82F6',
      isActive: data.isActive ?? true
    });
    
    await category.save();
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error('Create category error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    
    const sessionCookie = getBusinessSessionCookie();
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie, 'base64').toString());
    } catch (e) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const data = await request.json();
    const category = await Category.findOneAndUpdate(
      { _id: data.id, businessId: sessionData.businessId },
      {
        name: data.name,
        description: data.description,
        color: data.color,
        isActive: data.isActive
      },
      { new: true }
    );
    
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    return NextResponse.json(category, { status: 200 });
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    
    const sessionCookie = getBusinessSessionCookie();
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie, 'base64').toString());
    } catch (e) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Category ID required' }, { status: 400 });
    }
    
    await Category.findOneAndDelete({ _id: id, businessId: sessionData.businessId });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
