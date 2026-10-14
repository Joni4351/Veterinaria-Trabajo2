using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Repositories
{
    public class UsuarioRepository : IUsuarioRepository
    {
        private readonly VeterinariodbContext _db;

        public UsuarioRepository(VeterinariodbContext db)
        {
            _db = db;
        }

        public async Task<List<Usuario>> ObtenerTodosAsync()
        {
            return await _db.Usuarios.Include(u => u.Rol).ToListAsync();
        }

        public IQueryable<Usuario> Query()
        {
            return _db.Usuarios.Include(u => u.Rol).AsQueryable();
        }

        public async Task<Usuario?> ObtenerPorIdAsync(int id)
        {
            return await _db.Usuarios.FindAsync(id);
        }

        public async Task<Usuario?> ObtenerPorEmailAsync(string email)
        {
            return await _db.Usuarios
                .Include(u => u.Rol)
                .FirstOrDefaultAsync(u => u.Email == email);
        }

        public async Task CrearAsync(Usuario usuario)
        {
            await _db.Usuarios.AddAsync(usuario);
        }

        public async Task EliminarAsync(Usuario usuario)
        {
            _db.Usuarios.Remove(usuario);
            await Task.CompletedTask;
        }

        public async Task GuardarCambiosAsync()
        {
            await _db.SaveChangesAsync();
        }
    }
}